import { buildingConfig, translations } from './config.js';
import * as state from './state.js';
import { updateBuildingsList, showRenameModal, updateCastleDistanceDisplay  } from './uiManager.js';
import { addTouchHandlersToBuilding } from './touchControls.js';

/**
 * Проверяет, возможно ли сместить все здания в указанном направлении.
 * @param {number} dx - Смещение по X (1, -1, или 0).
 * @param {number} dy - Смещение по Y (1, -1, или 0).
 * @returns {boolean} - true, если смещение возможно, иначе false.
 */
function canShiftAllBuildings(dx, dy) {
    if (state.buildings.length === 0) return false; // Нечего смещать

    for (const building of state.buildings) {
        const newX = building.x + dx;
        const newY = building.y + dy;
        const buildingWidth = building.width || building.size;
        const buildingHeight = building.height || building.size;

        // Проверка выхода за пределы сетки
        if (newX < 0 || newX + buildingWidth > state.gridSize ||
            newY < 0 || newY + buildingHeight > state.gridSize) {
            return false; // Одно из зданий выйдет за пределы
        }
    }
    return true; // Все здания могут быть смещены
}

/**
 * Смещает все здания на сетке.
 * Важно: Эта функция НЕ проверяет на перекрытия между зданиями после смещения,
 * так как все здания смещаются одновременно, сохраняя относительное положение.
 * Проверка на выход за границы сетки должна быть сделана заранее с помощью canShiftAllBuildings.
 * @param {number} dx - Смещение по X.
 * @param {number} dy - Смещение по Y.
 */
export function shiftAllBuildings(dx, dy) {
    if (!canShiftAllBuildings(dx, dy)) {
        alert(translations[state.currentLang]?.cannotShiftFurther || "Cannot shift buildings further."); // Добавить перевод
        return;
    }

    // Важно: Обновляем координаты в два прохода, чтобы избежать проблем
    // если бы мы обновляли DOM и данные в одном цикле и это влияло бы на checkOverlap
    // (хотя в данном случае мы не делаем checkOverlap).
    // Но для чистоты - сначала обновляем данные, потом DOM.

    const originalPositions = state.buildings.map(b => ({ ...b })); // Копируем для возможного отката, если бы была сложная проверка

    let requiresDistanceUpdate = false;

    // 1. Обновить координаты в объектах зданий
    state.buildings.forEach(building => {
        building.x += dx;
        building.y += dy;
        if (building.type === 'castle' || building.type === 'hellgates') {
            requiresDistanceUpdate = true;
        }
    });

    // 2. Обновить DOM для каждого здания
    state.buildings.forEach(building => {
        updateBuilding(building); // Эта функция обновляет style.left, style.top и т.д.
    });

    // 3. Если активен режим "До адских врат" и были смещены замки/врата, обновить их отображение
    if (state.showDistanceToHG && requiresDistanceUpdate) {
        updateCastleDistanceDisplay();
    }
}

// Проверка перекрытия с другими зданиями
export function checkOverlap(x, y, width, height) {
    if (height === undefined) {
        height = width;
    }
    for (const building of state.buildings) {
        const buildingWidth = building.width || building.size;
        const buildingHeight = building.height || building.size;

        if (x < building.x + buildingWidth &&
            x + width > building.x &&
            y < building.y + buildingHeight &&
            y + height > building.y) {
            return true;
        }
    }
    return false;
}

// Добавление здания на сетку (DOM-элемент)
export function addBuildingToGrid(building) {
    const grid = document.getElementById('grid');

    if (building.areaSize > 0) {
        const area = document.createElement('div');
        area.className = 'building-area';
        area.id = `area-${building.id}`;
        const offset = Math.floor((building.areaSize - building.size) / 2);
        const areaX = building.x - offset;
        const areaY = building.y - offset;
        area.style.left = `${areaX * state.cellSize}px`;
        area.style.top = `${areaY * state.cellSize}px`;
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
        const icon = document.createElement('div');
        icon.textContent = building.icon;
        buildingEl.appendChild(icon);
        if (building.type === 'deadzone' && building.playerName) {
            const nameEl = document.createElement('div');
            nameEl.className = 'deadzone-name';
            nameEl.textContent = building.playerName;
            // nameEl.style.marginLeft = '5px'; // Стиль лучше в CSS
            buildingEl.appendChild(nameEl);
        }
    }

    if (building.type === 'castle' && building.playerName) {
        const nameEl = document.createElement('div');
        nameEl.className = 'player-castle-name';
        nameEl.textContent = building.playerName;
        buildingEl.appendChild(nameEl);
    }
    if (building.type === 'castle') {
        buildingEl.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    }

    if (building.type === 'deadzone') {
        if (!building.width) building.width = building.size;
        if (!building.height) building.height = building.size;
        buildingEl.style.backgroundColor = buildingConfig[building.type].bgcolor;
        buildingEl.style.width = `${building.width * state.cellSize}px`;
        buildingEl.style.height = `${building.height * state.cellSize}px`;
        makeDeadZoneResizable(buildingEl, building);
    } else {
        buildingEl.style.width = `${building.size * state.cellSize}px`;
        buildingEl.style.height = `${building.size * state.cellSize}px`;
    }

    addTouchHandlersToBuilding(buildingEl, building);

    buildingEl.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Левая кнопка мыши
            if (state.isGridRotated) {
                state.setIsGridRotated(false);
                document.querySelector('.grid-container').classList.remove('rotated');
                // Обновить текст кнопки поворота, если нужно
            }

            selectBuilding(building.id);

            const startMouseX = e.clientX;
            const startMouseY = e.clientY;
            const startBuildingX = building.x;
            const startBuildingY = building.y;
            const buildingSize = building.size; // или width/height для deadzone

            const currentBuildingWidth = building.width || building.size;
            const currentBuildingHeight = building.height || building.size;


            const handleMouseMove = (moveEvent) => {
                const deltaXGrid = Math.round((moveEvent.clientX - startMouseX) / state.cellSize);
                const deltaYGrid = Math.round((moveEvent.clientY - startMouseY) / state.cellSize);

                const newX = Math.max(0, Math.min(state.gridSize - currentBuildingWidth, startBuildingX + deltaXGrid));
                const newY = Math.max(0, Math.min(state.gridSize - currentBuildingHeight, startBuildingY + deltaYGrid));

                // Временно убрать здание из массива для проверки перекрытия с ОСТАЛЬНЫМИ
                const index = state.buildings.findIndex(b => b.id === building.id);
                const tempBuilding = state.buildings.splice(index, 1)[0];

                if (!checkOverlap(newX, newY, currentBuildingWidth, currentBuildingHeight)) {
                    building.x = newX;
                    building.y = newY;
                    updateBuilding(building); // Обновляет DOM и playerName, если нужно
                }
                state.buildings.splice(index, 0, tempBuilding); // Вернуть здание в массив
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });
    grid.appendChild(buildingEl);
}

// Создание объекта здания и добавление в state.buildings и на сетку
export function createBuilding(type, x, y, playerName = '') {
    const config = buildingConfig[type];
    if (!config) return;

    if (config.limit > 0) {
        const count = state.buildings.filter(b => b.type === type).length;
        if (count >= config.limit) {
            alert(state.currentLang === 'ru' ?
                `Достигнут лимит зданий типа ${translations[state.currentLang][type]}` :
                `Building limit reached for ${translations[state.currentLang][type]}`);
            return;
        }
    }

    // Корректировка позиции для зданий размером больше 1x1
    const buildingSizeForPlacement = (type === 'deadzone' && config.size === 1) ? 1 : config.size;

    if (buildingSizeForPlacement > 1) {
        x = Math.max(0, Math.min(state.gridSize - buildingSizeForPlacement, x));
        y = Math.max(0, Math.min(state.gridSize - buildingSizeForPlacement, y));
    } else {
        x = Math.max(0, Math.min(state.gridSize - 1, x));
        y = Math.max(0, Math.min(state.gridSize - 1, y));
    }

    if (checkOverlap(x, y, buildingSizeForPlacement, buildingSizeForPlacement)) {
        alert(state.currentLang === 'ru' ? 'Здания не могут перекрываться!' : 'Buildings cannot overlap!');
        return;
    }

    const newBuilding = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: type,
        x: x,
        y: y,
        playerName: type === 'castle' || type === 'deadzone' ? playerName : '', // Allow name for deadzone
        size: config.size,
        areaSize: config.areaSize,
        icon: config.icon,
        // Для deadzone начальные width/height равны size
        ...(type === 'deadzone' ? { width: config.size, height: config.size } : {})
    };

    state.buildings.push(newBuilding);
    addBuildingToGrid(newBuilding);
    updateBuildingsList();
}

// Обновление положения и внешнего вида здания (DOM)
export function updateBuilding(building) {
    const buildingEl = document.getElementById(`building-${building.id}`);
    if (!buildingEl) return;

    buildingEl.style.left = `${building.x * state.cellSize}px`;
    buildingEl.style.top = `${building.y * state.cellSize}px`;

    if (building.areaSize > 0) {
        const areaEl = document.getElementById(`area-${building.id}`);
        if (areaEl) {
            const offset = Math.floor((building.areaSize - building.size) / 2);
            const areaX = building.x - offset;
            const areaY = building.y - offset;
            areaEl.style.left = `${areaX * state.cellSize}px`;
            areaEl.style.top = `${areaY * state.cellSize}px`;
        }
    }

    if (building.type === 'castle') {
        let nameEl = buildingEl.querySelector('.player-castle-name');
        if (!nameEl && building.playerName) {
            nameEl = document.createElement('div');
            nameEl.className = 'player-castle-name';
            buildingEl.appendChild(nameEl);
        }
        if (nameEl) nameEl.textContent = building.playerName || '';
    }

    if (building.type === 'deadzone') {
        buildingEl.style.width = `${building.width * state.cellSize}px`;
        buildingEl.style.height = `${building.height * state.cellSize}px`;
        let nameEl = buildingEl.querySelector('.deadzone-name');
        if (!nameEl && building.playerName) {
            nameEl = document.createElement('div');
            nameEl.className = 'deadzone-name';
            buildingEl.appendChild(nameEl);
        }
        if (nameEl) {
            nameEl.textContent = building.playerName || '';
            nameEl.style.display = building.playerName ? 'block' : 'none';
        } else if (building.playerName) { // Create if doesn't exist and has name
            const newNameEl = document.createElement('div');
            newNameEl.className = 'deadzone-name';
            newNameEl.textContent = building.playerName;
            buildingEl.appendChild(newNameEl);
        }
    }
}

// Выбор здания
export function selectBuilding(id) {
    if (state.selectedBuilding) {
        const prevEl = document.getElementById(`building-${state.selectedBuilding}`);
        if (prevEl) prevEl.classList.remove('selected');
        const prevListItem = document.getElementById(`list-item-${state.selectedBuilding}`);
        if (prevListItem) prevListItem.classList.remove('selected');
    }
    state.setSelectedBuilding(id);
    if (state.selectedBuilding) {
        const buildingEl = document.getElementById(`building-${state.selectedBuilding}`);
        if (buildingEl) buildingEl.classList.add('selected');
        const listItem = document.getElementById(`list-item-${state.selectedBuilding}`);
        if (listItem) {
            listItem.classList.add('selected');
            listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Удаление здания
export function deleteBuilding(id) {
    const index = state.buildings.findIndex(b => b.id === id);
    if (index === -1) return;

    const buildingToDelete = state.buildings[index];
    state.buildings.splice(index, 1);

    const buildingEl = document.getElementById(`building-${id}`);
    if (buildingEl) buildingEl.remove();
    if (buildingToDelete.areaSize > 0) {
        const areaEl = document.getElementById(`area-${id}`);
        if (areaEl) areaEl.remove();
    }
    if (state.selectedBuilding === id) state.setSelectedBuilding(null);
    updateBuildingsList();
}

// Изменение размера мертвой зоны
export function makeDeadZoneResizable(buildingEl, building) {
    if (building.type !== 'deadzone') return;

    if (!building.width) building.width = building.size || 1;
    if (!building.height) building.height = building.size || 1;

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    buildingEl.appendChild(resizeHandle);

    const startResize = (e) => {
        e.stopPropagation(); // Prevent dragging the building
        const isTouchEvent = e.type === 'touchstart';
        const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;
        const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;

        const startMouseX = clientX;
        const startMouseY = clientY;
        const startWidth = building.width;
        const startHeight = building.height;

        const handleResizeMove = (moveEvent) => {
            const moveClientX = isTouchEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveClientY = isTouchEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            // Delta in grid cells, rounded to nearest cell
            const deltaX = Math.round((moveClientX - startMouseX) / state.cellSize);
            const deltaY = Math.round((moveClientY - startMouseY) / state.cellSize);

            let newWidth = Math.max(1, startWidth + deltaX);
            let newHeight = Math.max(1, startHeight + deltaY);

            // Boundary checks against grid edges
            newWidth = Math.min(newWidth, state.gridSize - building.x);
            newHeight = Math.min(newHeight, state.gridSize - building.y);


            // Temporarily remove building for overlap check (excluding itself)
            const index = state.buildings.findIndex(b => b.id === building.id);
            const tempBuilding = state.buildings.splice(index, 1)[0];

            if (!checkOverlap(building.x, building.y, newWidth, newHeight)) {
                 building.width = newWidth;
                 building.height = newHeight;
                 buildingEl.style.width = `${building.width * state.cellSize}px`;
                 buildingEl.style.height = `${building.height * state.cellSize}px`;
            }
             state.buildings.splice(index, 0, tempBuilding); // Add back
        };

        const handleResizeEnd = () => {
            if (isTouchEvent) {
                document.removeEventListener('touchmove', handleResizeMove);
                document.removeEventListener('touchend', handleResizeEnd);
            } else {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            }
        };

        if (isTouchEvent) {
            document.addEventListener('touchmove', handleResizeMove, { passive: false });
            document.addEventListener('touchend', handleResizeEnd);
        } else {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
        }
    };

    resizeHandle.addEventListener('mousedown', startResize);
    resizeHandle.addEventListener('touchstart', startResize, { passive: false });
}