// buildingManager.js
// Отвечает за логику создания, обновления, удаления, выбора зданий,
// а также за массовые операции над ними (смещение).

import { buildingConfig, translations } from './config.js';
import * as state from './state.js';
// Функции из uiManager для обновления связанных частей интерфейса
import {
    // updateBuildingsList, // Удалено, так как список зданий упразднен
    showRenameModal,
    updateCastleDistanceDisplay,
    updateAverageDistanceDisplay,
    updateRotateButtonVisualState,
    updateSelectedBuildingToolbar // Для обновления состояния новой панели инструментов
} from './uiManager.js';
// Функции из touchControls для добавления сенсорных обработчиков к зданиям
import { addTouchHandlersToBuilding } from './touchControls.js';

/**
 * Подстраивает размер шрифта подписи (замка или мертвой зоны) так, чтобы текст
 * вписывался в рамку здания без скроллбаров.
 * @param {HTMLElement} nameEl - DOM-элемент подписи.
 * @param {HTMLElement} buildingEl - DOM-элемент здания.
 */
function adjustNameFontSize(nameEl, buildingEl) {
    if (!nameEl || !buildingEl) return;

    // Начальные параметры
    const minFontSize = 8;
    const maxFontSize = 18; // Увеличенный максимум, чтобы подпись могла занять большую часть области
    let fontSize = maxFontSize;

    // Бинарный поиск оптимального размера шрифта
    while (fontSize >= minFontSize) {
        nameEl.style.fontSize = `${fontSize}px`;
        
        // Проверяем, вписывается ли содержимое в контейнер без скроллбара
        if (nameEl.scrollHeight <= nameEl.clientHeight && 
            nameEl.scrollWidth <= nameEl.clientWidth) {
            break;
        }
        fontSize--;
    }
}

// --- Функции для управления отдельными зданиями ---

/**
 * Проверяет, перекрывается ли заданная прямоугольная область с существующими зданиями на сетке.
 * Используется для предотвращения размещения зданий друг на друге.
 * @param {number} x - Координата X левого верхнего угла проверяемой области.
 * @param {number} y - Координата Y левого верхнего угла проверяемой области.
 * @param {number} width - Ширина проверяемой области.
 * @param {number} height - Высота проверяемой области.
 * @returns {boolean} - True, если обнаружено перекрытие, иначе false.
 */
export function checkOverlap(x, y, width, height) {
    const checkHeight = height === undefined ? width : height;

    for (const building of state.buildings) {
        const buildingWidth = building.width || building.size;
        const buildingHeight = building.height || building.size;

        if (x < building.x + buildingWidth &&
            x + width > building.x &&
            y < building.y + buildingHeight &&
            y + checkHeight > building.y) {
            return true;
        }
    }
    return false;
}

/**
 * Создает новый объект здания, добавляет его в глобальное состояние и отображает на сетке.
 * @param {string} type - Тип создаваемого здания (ключ из `buildingConfig`).
 * @param {number} x - Начальная координата X на сетке.
 * @param {number} y - Начальная координата Y на сетке.
 * @param {string} [playerName=''] - Имя игрока или название (для 'castle', 'deadzone').
 */
export function createBuilding(type, x, y, playerName = '') {
    const config = buildingConfig[type];
    if (!config) {
        console.error(`[buildingManager] Попытка создать здание неизвестного типа: ${type}`);
        return;
    }

    if (config.limit > 0) {
        const count = state.buildings.filter(b => b.type === type).length;
        if (count >= config.limit) {
            alert((translations[state.currentLang]?.[type] || type) + ": " +
                  (translations[state.currentLang]?.limitReached || "лимит достигнут"));
            return;
        }
    }

    const placementSize = config.size;
    x = Math.max(0, Math.min(state.gridSize - placementSize, x));
    y = Math.max(0, Math.min(state.gridSize - placementSize, y));

    if (checkOverlap(x, y, placementSize, placementSize)) {
        alert(translations[state.currentLang]?.cannotOverlapMsg ||
              (state.currentLang === 'ru' ? 'Здания не могут перекрываться!' : 'Buildings cannot overlap!'));
        return;
    }

    const newBuilding = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
        type: type,
        x: x,
        y: y,
        playerName: (type === 'castle' || type === 'deadzone') ? playerName.trim() : '',
        size: config.size,
        areaSize: config.areaSize,
        icon: config.icon,
        ...(type === 'deadzone' && { width: config.size, height: config.size })
    };

    state.buildings.push(newBuilding);
    addBuildingToGrid(newBuilding);
    selectBuilding(newBuilding.id);

    if (state.showDistanceToHG && (type === 'castle' || type === 'hellgates')) {
        updateCastleDistanceDisplay();
    }

    // Обновляем отображение среднего расстояния при добавлении замка или адских врат
    if (type === 'castle' || type === 'hellgates') {
        updateAverageDistanceDisplay();
    }
}

/**
 * Создает и добавляет DOM-представление здания на сетку.
 * Также навешивает обработчики событий (mousedown для перемещения, тач-события).
 * @param {Object} building - Объект здания из `state.buildings`.
 */
export function addBuildingToGrid(building) {
    const grid = document.getElementById('grid');
    if (!grid) {
        console.error("[buildingManager] Элемент #grid не найден.");
        return;
    }

    if (building.areaSize > 0) {
        const area = document.createElement('div');
        area.className = 'building-area';
        area.id = `area-${building.id}`;
        const offset = Math.floor((building.areaSize - building.size) / 2);
        area.style.left = `${(building.x - offset) * state.cellSize}px`;
        area.style.top = `${(building.y - offset) * state.cellSize}px`;
        area.style.width = `${building.areaSize * state.cellSize}px`;
        area.style.height = `${building.areaSize * state.cellSize}px`;
        grid.appendChild(area);
    }

    const buildingEl = document.createElement('div');
    buildingEl.className = 'building';
    buildingEl.id = `building-${building.id}`;
    buildingEl.dataset.id = building.id;
    buildingEl.style.left = `${building.x * state.cellSize}px`;
    buildingEl.style.top = `${building.y * state.cellSize}px`;

    if (building.type !== 'castle') {
        const iconEl = document.createElement('div');
        iconEl.className = 'icon';
        iconEl.textContent = building.icon;
        buildingEl.appendChild(iconEl);
        if (building.type === 'deadzone' && building.playerName) {
            const nameEl = document.createElement('div');
            nameEl.className = 'deadzone-name';
            nameEl.textContent = building.playerName;
            buildingEl.appendChild(nameEl);
            // Подстраиваем размер шрифта после добавления элемента в DOM
            requestAnimationFrame(() => adjustNameFontSize(nameEl, buildingEl));
        }
    } else {
        if (building.playerName) {
            const nameEl = document.createElement('div');
            nameEl.className = 'player-castle-name';
            nameEl.textContent = building.playerName;
            buildingEl.appendChild(nameEl);
            // Подстраиваем размер шрифта после добавления элемента в DOM
            requestAnimationFrame(() => adjustNameFontSize(nameEl, buildingEl));
        }
        buildingEl.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    }

    if (building.type === 'deadzone') {
        buildingEl.style.width = `${(building.width || building.size) * state.cellSize}px`;
        buildingEl.style.height = `${(building.height || building.size) * state.cellSize}px`;
        buildingEl.style.backgroundColor = buildingConfig[building.type].bgcolor;
        makeDeadZoneResizable(buildingEl, building);
    } else {
        buildingEl.style.width = `${building.size * state.cellSize}px`;
        buildingEl.style.height = `${building.size * state.cellSize}px`;
    }

    addTouchHandlersToBuilding(buildingEl, building);

    buildingEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;

        if (state.isGridRotated) {
            state.setIsGridRotated(false);
            document.querySelector('.grid-container')?.classList.remove('rotated');
            updateRotateButtonVisualState();
        }
        selectBuilding(building.id);

        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startBuildingX = building.x;
        const startBuildingY = building.y;
        const currentBuildingWidth = building.width || building.size;
        const currentBuildingHeight = building.height || building.size;
        let moved = false;

        const handleMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            const deltaXGrid = Math.round((moveEvent.clientX - startMouseX) / state.cellSize);
            const deltaYGrid = Math.round((moveEvent.clientY - startMouseY) / state.cellSize);
            if (deltaXGrid !== 0 || deltaYGrid !== 0) moved = true;

            const newX = Math.max(0, Math.min(state.gridSize - currentBuildingWidth, startBuildingX + deltaXGrid));
            const newY = Math.max(0, Math.min(state.gridSize - currentBuildingHeight, startBuildingY + deltaYGrid));

            const originalIndex = state.buildings.findIndex(b => b.id === building.id);
            if (originalIndex === -1) return;
            const tempBuildingData = state.buildings.splice(originalIndex, 1)[0];

            if (!checkOverlap(newX, newY, currentBuildingWidth, currentBuildingHeight)) {
                building.x = newX;
                building.y = newY;
                updateBuilding(building);
            }
            state.buildings.splice(originalIndex, 0, tempBuildingData);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (moved && state.showDistanceToHG && (building.type === 'castle' || building.type === 'hellgates')) {
                updateCastleDistanceDisplay();
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    grid.appendChild(buildingEl);

    // Обновление отображения расстояния, если этот замок был только что добавлен и режим активен
    if (state.showDistanceToHG && building.type === 'castle' && buildingEl.querySelector('.player-castle-name')) {
         updateCastleDistanceDisplay(); // Гарантирует, что расстояние отобразится сразу
    }
}

/**
 * Обновляет DOM-представление существующего здания.
 * @param {Object} building - Объект здания из `state.buildings`.
 */
export function updateBuilding(building) {
    const buildingEl = document.getElementById(`building-${building.id}`);
    if (!buildingEl) return;

    buildingEl.style.left = `${building.x * state.cellSize}px`;
    buildingEl.style.top = `${building.y * state.cellSize}px`;

    if (building.areaSize > 0) {
        const areaEl = document.getElementById(`area-${building.id}`);
        if (areaEl) {
            const offset = Math.floor((building.areaSize - building.size) / 2);
            areaEl.style.left = `${(building.x - offset) * state.cellSize}px`;
            areaEl.style.top = `${(building.y - offset) * state.cellSize}px`;
        }
    }

    let nameEl;
    if (building.type === 'castle') {
        nameEl = buildingEl.querySelector('.player-castle-name');
        if (!nameEl && building.playerName) {
            nameEl = document.createElement('div');
            nameEl.className = 'player-castle-name';
            buildingEl.appendChild(nameEl);
        }
    } else if (building.type === 'deadzone') {
        buildingEl.style.width = `${(building.width || building.size) * state.cellSize}px`;
        buildingEl.style.height = `${(building.height || building.size) * state.cellSize}px`;
        nameEl = buildingEl.querySelector('.deadzone-name');
        if (!nameEl && building.playerName) {
            nameEl = document.createElement('div');
            nameEl.className = 'deadzone-name';
            buildingEl.appendChild(nameEl);
        }
    }

    if (nameEl) {
        if (state.showDistanceToHG && building.type === 'castle') {
            // Текст будет установлен или обновлен функцией updateCastleDistanceDisplay,
            // которая вызывается в нужные моменты (например, при переключении режима или перемещении).
            // Здесь мы не дублируем эту логику.
        } else {
            nameEl.textContent = building.playerName || '';
            // Подстраиваем размер шрифта после изменения текста
            requestAnimationFrame(() => adjustNameFontSize(nameEl, buildingEl));
        }
        if (building.type === 'deadzone') {
            nameEl.style.display = building.playerName ? 'block' : 'none';
        }
    }

    // Обновляем отображение среднего расстояния если был перемещен замок или адские врата
    if (building.type === 'castle' || building.type === 'hellgates') {
        updateAverageDistanceDisplay();
    }
}

/**
 * Выделяет здание на сетке и обновляет состояние панели инструментов для выделенного здания.
 * @param {string|null} id - ID здания для выделения. Если null, снимает выделение.
 */
export function selectBuilding(id) {
    if (state.selectedBuilding && state.selectedBuilding !== id) {
        document.getElementById(`building-${state.selectedBuilding}`)?.classList.remove('selected');
    }

    state.setSelectedBuilding(id);

    if (id) {
        document.getElementById(`building-${id}`)?.classList.add('selected');
    }
    updateSelectedBuildingToolbar(); // Обновляем новую панель инструментов
}

/**
 * Удаляет здание из состояния, с сетки и обновляет UI.
 * @param {string} id - ID удаляемого здания.
 */
export function deleteBuilding(id) {
    const index = state.buildings.findIndex(b => b.id === id);
    if (index === -1) return;

    const buildingToDelete = state.buildings.splice(index, 1)[0];

    document.getElementById(`building-${id}`)?.remove();
    if (buildingToDelete.areaSize > 0) {
        document.getElementById(`area-${id}`)?.remove();
    }

    if (state.selectedBuilding === id) {
        state.setSelectedBuilding(null);
    }
    // updateBuildingsList(); // Список удален
    updateSelectedBuildingToolbar(); // Обновить состояние панели после удаления

    if (state.showDistanceToHG && (buildingToDelete.type === 'castle' || buildingToDelete.type === 'hellgates')) {
        updateCastleDistanceDisplay();
    }

    // Обновляем отображение среднего расстояния при удалении замка или адских врат
    if (buildingToDelete.type === 'castle' || buildingToDelete.type === 'hellgates') {
        updateAverageDistanceDisplay();
    }
}

/**
 * Позволяет изменять размер "мертвой зоны" с помощью специального элемента ("ручки").
 * @param {HTMLElement} buildingEl - DOM-элемент мертвой зоны.
 * @param {Object} building - Объект мертвой зоны из `state.buildings`.
 */
export function makeDeadZoneResizable(buildingEl, building) {
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    buildingEl.appendChild(resizeHandle);

    const startResize = (eStart) => {
        eStart.stopPropagation();
        const isTouchEvent = eStart.type.startsWith('touch');
        const clientXStart = isTouchEvent ? eStart.touches[0].clientX : eStart.clientX;
        const clientYStart = isTouchEvent ? eStart.touches[0].clientY : eStart.clientY;
        const initialWidthCells = building.width;
        const initialHeightCells = building.height;

        const handleResizeMove = (eMove) => {
            if (isTouchEvent && (!eMove.touches || eMove.touches.length !== 1)) return;
            if (isTouchEvent) eMove.preventDefault(); // Для предотвращения скролла при ресайзе на таче

            const clientXMove = isTouchEvent ? eMove.touches[0].clientX : eMove.clientX;
            const clientYMove = isTouchEvent ? eMove.touches[0].clientY : eMove.clientY;
            const deltaXCells = Math.round((clientXMove - clientXStart) / state.cellSize);
            const deltaYCells = Math.round((clientYMove - clientYStart) / state.cellSize);

            let newWidthCells = Math.max(1, initialWidthCells + deltaXCells);
            let newHeightCells = Math.max(1, initialHeightCells + deltaYCells);
            newWidthCells = Math.min(newWidthCells, state.gridSize - building.x);
            newHeightCells = Math.min(newHeightCells, state.gridSize - building.y);

            const originalIndex = state.buildings.findIndex(b => b.id === building.id);
            if (originalIndex === -1) return;
            const tempBuildingData = state.buildings.splice(originalIndex, 1)[0];

            if (!checkOverlap(building.x, building.y, newWidthCells, newHeightCells)) {
                building.width = newWidthCells;
                building.height = newHeightCells;
                buildingEl.style.width = `${building.width * state.cellSize}px`;
                buildingEl.style.height = `${building.height * state.cellSize}px`;
            }
            state.buildings.splice(originalIndex, 0, tempBuildingData);
        };

        const handleResizeEnd = () => {
            const eventMove = isTouchEvent ? 'touchmove' : 'mousemove';
            const eventEnd = isTouchEvent ? 'touchend' : 'mouseup';
            document.removeEventListener(eventMove, handleResizeMove);
            document.removeEventListener(eventEnd, handleResizeEnd);
        };

        const eventMove = isTouchEvent ? 'touchmove' : 'mousemove';
        const eventEnd = isTouchEvent ? 'touchend' : 'mouseup';
        document.addEventListener(eventMove, handleResizeMove, isTouchEvent ? { passive: false } : false);
        document.addEventListener(eventEnd, handleResizeEnd);
    };

    resizeHandle.addEventListener('mousedown', startResize);
    resizeHandle.addEventListener('touchstart', startResize, { passive: false });
}


// --- Функции для массового управления зданиями ---

/**
 * Проверяет, возможно ли сместить все здания в указанном направлении, не выходя за границы сетки.
 * @param {number} dx - Смещение по оси X.
 * @param {number} dy - Смещение по оси Y.
 * @returns {boolean} - True, если смещение возможно.
 */
function canShiftAllBuildings(dx, dy) {
    if (state.buildings.length === 0) return false;
    for (const building of state.buildings) {
        const newX = building.x + dx;
        const newY = building.y + dy;
        const buildingWidth = building.width || building.size;
        const buildingHeight = building.height || building.size;
        if (newX < 0 || (newX + buildingWidth) > state.gridSize ||
            newY < 0 || (newY + buildingHeight) > state.gridSize) {
            return false;
        }
    }
    return true;
}

/**
 * Смещает все размещенные на сетке здания на указанное количество ячеек.
 * @param {number} dx - Смещение по оси X.
 * @param {number} dy - Смещение по оси Y.
 */
export function shiftAllBuildings(dx, dy) {
    if (!canShiftAllBuildings(dx, dy)) {
        alert(translations[state.currentLang]?.cannotShiftFurther || "Невозможно сдвинуть здания дальше.");
        return;
    }

    let castlesOrHGMoved = false;
    state.buildings.forEach(building => {
        building.x += dx;
        building.y += dy;
        if (building.type === 'castle' || building.type === 'hellgates') {
            castlesOrHGMoved = true;
        }
    });

    state.buildings.forEach(building => {
        updateBuilding(building);
    });

    if (state.showDistanceToHG && castlesOrHGMoved) {
        updateCastleDistanceDisplay();
    }
}