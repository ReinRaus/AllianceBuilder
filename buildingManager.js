import { buildingConfig, translations } from './config.js';
import * as state from './state.js';
import { updateBuildingsList, updateCastleDistanceDisplay, updateRotateButtonVisualState } from './uiManager.js';
import { addTouchHandlersToBuilding } from './touchControls.js';

// --- Функции для управления размещением и свойствами зданий ---

/**
 * Проверяет, перекрывается ли указанная область с существующими зданиями.
 * @param {number} x Координата X левого верхнего угла проверяемой области.
 * @param {number} y Координата Y левого верхнего угла проверяемой области.
 * @param {number} width Ширина проверяемой области.
 * @param {number} height Высота проверяемой области.
 * @returns {boolean} True, если есть перекрытие, иначе false.
 */
export function checkOverlap(x, y, width, height) {
    // Если height не передан, считаем область квадратной (для обратной совместимости)
    if (height === undefined) {
        height = width;
    }

    for (const building of state.buildings) {
        const buildingWidth = building.width || building.size; // Учитываем кастомную ширину для deadzone
        const buildingHeight = building.height || building.size; // Учитываем кастомную высоту для deadzone

        // Стандартная проверка пересечения двух прямоугольников
        if (x < building.x + buildingWidth &&
            x + width > building.x &&
            y < building.y + buildingHeight &&
            y + height > building.y) {
            return true; // Найдено перекрытие
        }
    }
    return false; // Перекрытий нет
}

/**
 * Создает объект нового здания и добавляет его в состояние и на сетку.
 * @param {string} type Тип создаваемого здания (ключ из buildingConfig).
 * @param {number} x Координата X для размещения.
 * @param {number} y Координата Y для размещения.
 * @param {string} [playerName=''] Имя игрока/название (для замков, мертвых зон).
 */
export function createBuilding(type, x, y, playerName = '') {
    const config = buildingConfig[type];
    if (!config) {
        console.error(`Попытка создать здание неизвестного типа: ${type}`);
        return;
    }

    // Проверка лимита на количество зданий данного типа
    if (config.limit > 0) {
        const count = state.buildings.filter(b => b.type === type).length;
        if (count >= config.limit) {
            alert(translations[state.currentLang][`limitReached_${type}`] || // POTENTIAL_ISSUE: Таких ключей нет в translations
                  (state.currentLang === 'ru' ?
                  `Достигнут лимит зданий типа ${translations[state.currentLang][type]}` :
                  `Building limit reached for ${translations[state.currentLang][type]}`));
            return;
        }
    }

    // Корректировка позиции, чтобы здание не выходило за пределы сетки
    // Для deadzone начальный размер для размещения берется из config.size
    const placementSize = config.size;
    if (placementSize > 1) {
        x = Math.max(0, Math.min(state.gridSize - placementSize, x));
        y = Math.max(0, Math.min(state.gridSize - placementSize, y));
    } else {
        x = Math.max(0, Math.min(state.gridSize - 1, x));
        y = Math.max(0, Math.min(state.gridSize - 1, y));
    }

    // Проверка перекрытия с другими зданиями перед созданием
    if (checkOverlap(x, y, placementSize, placementSize)) {
        alert(translations[state.currentLang].cannotOverlap || // POTENTIAL_ISSUE: Ключа cannotOverlap нет
              (state.currentLang === 'ru' ? 'Здания не могут перекрываться!' : 'Buildings cannot overlap!'));
        return;
    }

    const newBuilding = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // Уникальный ID
        type: type,
        x: x,
        y: y,
        playerName: (type === 'castle' || type === 'deadzone') ? playerName : '',
        size: config.size, // Базовый размер из конфига
        areaSize: config.areaSize,
        icon: config.icon,
        // Для deadzone устанавливаем начальные width/height равными базовому size
        ...(type === 'deadzone' ? { width: config.size, height: config.size } : {})
    };

    state.buildings.push(newBuilding);
    addBuildingToGrid(newBuilding); // Добавление DOM-элемента на сетку
    updateBuildingsList(); // Обновление списка размещенных зданий в UI

    // Если активен режим расстояний и добавлено здание, влияющее на расчеты
    if (state.showDistanceToHG && (type === 'castle' || type === 'hellgates')) {
        updateCastleDistanceDisplay();
    }
}

/**
 * Добавляет DOM-представление здания на сетку.
 * @param {Object} building Объект здания из state.buildings.
 */
export function addBuildingToGrid(building) {
    const grid = document.getElementById('grid');

    // Создание и добавление области влияния, если она есть
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

    // Создание основного DOM-элемента здания
    const buildingEl = document.createElement('div');
    buildingEl.className = 'building';
    buildingEl.id = `building-${building.id}`;
    buildingEl.dataset.id = building.id; // Сохраняем ID для легкого доступа
    buildingEl.style.left = `${building.x * state.cellSize}px`;
    buildingEl.style.top = `${building.y * state.cellSize}px`;

    // Добавление иконки (кроме замков, у них имя)
    // POTENTIAL_ISSUE: Логика отображения иконки/имени для замка может быть сложнее.
    // Сейчас иконка замка не отображается, если есть playerName.
    if (building.type !== 'castle') {
        const iconEl = document.createElement('div');
        iconEl.className = 'icon'; // Добавлен класс для возможной стилизации иконки
        iconEl.textContent = building.icon;
        buildingEl.appendChild(iconEl);

        // Отображение имени для мертвой зоны, если оно есть
        if (building.type === 'deadzone' && building.playerName) {
            const nameEl = document.createElement('div');
            nameEl.className = 'deadzone-name';
            nameEl.textContent = building.playerName;
            buildingEl.appendChild(nameEl);
        }
    }

    // Отображение имени для замка игрока
    if (building.type === 'castle' && building.playerName) {
        const nameEl = document.createElement('div');
        nameEl.className = 'player-castle-name';
        nameEl.textContent = building.playerName;
        buildingEl.appendChild(nameEl);
    }
    // Особый фон для замка
    if (building.type === 'castle') {
        buildingEl.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    }

    // Настройка размеров и специфики для мертвой зоны (включая изменение размера)
    if (building.type === 'deadzone') {
        // Устанавливаем width/height если они не определены (например, при первой загрузке)
        if (!building.width) building.width = building.size;
        if (!building.height) building.height = building.size;

        buildingEl.style.backgroundColor = buildingConfig[building.type].bgcolor;
        buildingEl.style.width = `${building.width * state.cellSize}px`;
        buildingEl.style.height = `${building.height * state.cellSize}px`;
        makeDeadZoneResizable(buildingEl, building);
    } else {
        // Стандартные размеры для остальных зданий
        buildingEl.style.width = `${building.size * state.cellSize}px`;
        buildingEl.style.height = `${building.size * state.cellSize}px`;
    }

    // Добавление обработчиков для сенсорного перемещения
    addTouchHandlersToBuilding(buildingEl, building);

    // Обработчик для перемещения здания мышью
    buildingEl.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Только левая кнопка мыши
            if (state.isGridRotated) { // Сброс поворота сетки перед началом перетаскивания
                state.setIsGridRotated(false);
                document.querySelector('.grid-container').classList.remove('rotated');
                updateRotateButtonVisualState();
            }
            selectBuilding(building.id);

            const startMouseX = e.clientX;
            const startMouseY = e.clientY;
            const startBuildingX = building.x;
            const startBuildingY = building.y;
            const currentBuildingWidth = building.width || building.size;
            const currentBuildingHeight = building.height || building.size;
            let moved = false; // Флаг, чтобы определить, было ли реальное перемещение

            const handleMouseMove = (moveEvent) => {
                // Расчет смещения в ячейках сетки, округление до ближайшей ячейки
                const deltaXGrid = Math.round((moveEvent.clientX - startMouseX) / state.cellSize);
                const deltaYGrid = Math.round((moveEvent.clientY - startMouseY) / state.cellSize);

                if (deltaXGrid !== 0 || deltaYGrid !== 0) moved = true;

                // Новые предполагаемые координаты с учетом границ сетки
                const newX = Math.max(0, Math.min(state.gridSize - currentBuildingWidth, startBuildingX + deltaXGrid));
                const newY = Math.max(0, Math.min(state.gridSize - currentBuildingHeight, startBuildingY + deltaYGrid));

                // Временно удаляем текущее здание из общего списка для корректной проверки перекрытия
                const index = state.buildings.findIndex(b => b.id === building.id);
                const tempBuilding = state.buildings.splice(index, 1)[0];

                if (!checkOverlap(newX, newY, currentBuildingWidth, currentBuildingHeight)) {
                    building.x = newX;
                    building.y = newY;
                    updateBuilding(building); // Обновление DOM-элемента здания
                }
                state.buildings.splice(index, 0, tempBuilding); // Возвращаем здание в список
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                // Если здание было перемещено и активен режим расстояний
                if (moved && state.showDistanceToHG && (building.type === 'castle' || building.type === 'hellgates')) {
                    updateCastleDistanceDisplay();
                }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });
    grid.appendChild(buildingEl);

    // Если это только что созданный замок, и активен режим расстояний, обновить его отображение
    // (Это может быть избыточно, если createBuilding уже вызывает updateCastleDistanceDisplay)
    // REFACTOR_SUGGESTION: Логику обновления отображения расстояний лучше централизовать.
    if (state.showDistanceToHG && building.type === 'castle' && document.getElementById(`building-${building.id}`)) {
        // updateCastleDistanceDisplay(); // Может вызвать двойное обновление
    }
}

/**
 * Обновляет DOM-представление существующего здания (позиция, имя, размеры для deadzone).
 * @param {Object} building Объект здания из state.buildings.
 */
export function updateBuilding(building) {
    const buildingEl = document.getElementById(`building-${building.id}`);
    if (!buildingEl) return;

    // Обновление позиции
    buildingEl.style.left = `${building.x * state.cellSize}px`;
    buildingEl.style.top = `${building.y * state.cellSize}px`;

    // Обновление области влияния, если она есть
    if (building.areaSize > 0) {
        const areaEl = document.getElementById(`area-${building.id}`);
        if (areaEl) {
            const offset = Math.floor((building.areaSize - building.size) / 2);
            areaEl.style.left = `${(building.x - offset) * state.cellSize}px`;
            areaEl.style.top = `${(building.y - offset) * state.cellSize}px`;
        }
    }

    // Обновление имени для замка (если не активен режим расстояний)
    // Эту логику берет на себя updateCastleDistanceDisplay, здесь просто обеспечиваем наличие элемента
    if (building.type === 'castle') {
        let nameEl = buildingEl.querySelector('.player-castle-name');
        if (!nameEl && building.playerName) { // Создать, если нет, но имя есть
            nameEl = document.createElement('div');
            nameEl.className = 'player-castle-name';
            buildingEl.appendChild(nameEl);
        }
        if (nameEl && !state.showDistanceToHG) { // Обновляем только если не режим расстояний
             nameEl.textContent = building.playerName || '';
        } else if (nameEl && state.showDistanceToHG) {
            // Текст будет установлен updateCastleDistanceDisplay
        }
    }

    // Обновление для мертвой зоны (размеры, имя)
    if (building.type === 'deadzone') {
        buildingEl.style.width = `${building.width * state.cellSize}px`;
        buildingEl.style.height = `${building.height * state.cellSize}px`;

        let nameEl = buildingEl.querySelector('.deadzone-name');
        if (!nameEl && building.playerName) { // Создать, если нет, но имя есть
            nameEl = document.createElement('div');
            nameEl.className = 'deadzone-name';
            buildingEl.appendChild(nameEl);
        }
        if (nameEl) {
            nameEl.textContent = building.playerName || '';
            nameEl.style.display = building.playerName ? 'block' : 'none'; // Скрыть, если имя пустое
        }
    }
}

/**
 * Выделяет здание на сетке и в списке.
 * @param {string|null} id ID здания для выделения, или null для снятия выделения.
 */
export function selectBuilding(id) {
    // Снятие выделения с предыдущего элемента
    if (state.selectedBuilding) {
        const prevBuildingEl = document.getElementById(`building-${state.selectedBuilding}`);
        if (prevBuildingEl) prevBuildingEl.classList.remove('selected');
        const prevListItemEl = document.getElementById(`list-item-${state.selectedBuilding}`);
        if (prevListItemEl) prevListItemEl.classList.remove('selected');
    }

    state.setSelectedBuilding(id); // Обновление состояния

    // Выделение нового элемента
    if (id) {
        const currentBuildingEl = document.getElementById(`building-${id}`);
        if (currentBuildingEl) currentBuildingEl.classList.add('selected');
        const currentListItemEl = document.getElementById(`list-item-${id}`);
        if (currentListItemEl) {
            currentListItemEl.classList.add('selected');
            currentListItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // Плавная прокрутка к элементу в списке
        }
    }
}

/**
 * Удаляет здание из состояния, с сетки и из списка.
 * @param {string} id ID удаляемого здания.
 */
export function deleteBuilding(id) {
    const index = state.buildings.findIndex(b => b.id === id);
    if (index === -1) return; // Здание не найдено

    const buildingToDelete = state.buildings[index];
    state.buildings.splice(index, 1); // Удаление из массива состояния

    // Удаление DOM-элементов
    const buildingEl = document.getElementById(`building-${id}`);
    if (buildingEl) buildingEl.remove();
    if (buildingToDelete.areaSize > 0) {
        const areaEl = document.getElementById(`area-${id}`);
        if (areaEl) areaEl.remove();
    }

    // Сброс выделения, если удалено выделенное здание
    if (state.selectedBuilding === id) {
        state.setSelectedBuilding(null);
    }

    updateBuildingsList(); // Обновление UI списка зданий

    // Обновление отображения расстояний, если удален замок или врата
    if (state.showDistanceToHG && (buildingToDelete.type === 'castle' || buildingToDelete.type === 'hellgates')) {
        updateCastleDistanceDisplay();
    }
}

/**
 * Делает мертвую зону изменяемой по размеру с помощью "ручки".
 * @param {HTMLElement} buildingEl DOM-элемент мертвой зоны.
 * @param {Object} building Объект мертвой зоны из state.buildings.
 */
export function makeDeadZoneResizable(buildingEl, building) {
    // Эта функция предполагает, что building.type === 'deadzone'
    // Начальные width/height уже должны быть установлены в addBuildingToGrid

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    buildingEl.appendChild(resizeHandle);

    const startResize = (eStart) => {
        eStart.stopPropagation(); // Предотвратить перетаскивание самого здания
        const isTouchEvent = eStart.type === 'touchstart';
        const clientXStart = isTouchEvent ? eStart.touches[0].clientX : eStart.clientX;
        const clientYStart = isTouchEvent ? eStart.touches[0].clientY : eStart.clientY;

        const initialWidthInCells = building.width;
        const initialHeightInCells = building.height;
        let moved = false; // Флаг, что изменение размера произошло

        const handleResizeMove = (eMove) => {
            if (isTouchEvent && eMove.touches.length !== 1) return;
            // eMove.preventDefault(); // POTENTIAL_ISSUE: Может быть излишним, если {passive:false} только на document

            const clientXMove = isTouchEvent ? eMove.touches[0].clientX : eMove.clientX;
            const clientYMove = isTouchEvent ? eMove.touches[0].clientY : eMove.clientY;

            // Изменение размера в ячейках сетки
            const deltaXCells = Math.round((clientXMove - clientXStart) / state.cellSize);
            const deltaYCells = Math.round((clientYMove - clientYStart) / state.cellSize);

            if (deltaXCells !== 0 || deltaYCells !== 0) moved = true;

            let newWidthCells = Math.max(1, initialWidthInCells + deltaXCells);
            let newHeightCells = Math.max(1, initialHeightInCells + deltaYCells);

            // Ограничение по границам сетки
            newWidthCells = Math.min(newWidthCells, state.gridSize - building.x);
            newHeightCells = Math.min(newHeightCells, state.gridSize - building.y);

            // Временно удаляем для проверки перекрытия (с другими зданиями)
            const index = state.buildings.findIndex(b => b.id === building.id);
            const tempBuilding = state.buildings.splice(index, 1)[0];

            // Проверяем перекрытие только если размеры действительно изменились
            // (Хотя checkOverlap должен быть достаточно быстрым)
            if (!checkOverlap(building.x, building.y, newWidthCells, newHeightCells)) {
                building.width = newWidthCells;
                building.height = newHeightCells;
                buildingEl.style.width = `${building.width * state.cellSize}px`;
                buildingEl.style.height = `${building.height * state.cellSize}px`;
            }
            state.buildings.splice(index, 0, tempBuilding); // Возвращаем
        };

        const handleResizeEnd = () => {
            const eventMove = isTouchEvent ? 'touchmove' : 'mousemove';
            const eventEnd = isTouchEvent ? 'touchend' : 'mouseup';
            document.removeEventListener(eventMove, handleResizeMove);
            document.removeEventListener(eventEnd, handleResizeEnd);
            // Если размер был изменен и активен режим расстояний (маловероятно для deadzone, но для консистентности)
            if (moved && state.showDistanceToHG && building.type === 'deadzone') { // deadzone обычно не влияет на расстояния
                // updateCastleDistanceDisplay();
            }
        };

        const eventMove = isTouchEvent ? 'touchmove' : 'mousemove';
        const eventEnd = isTouchEvent ? 'touchend' : 'mouseup';
        document.addEventListener(eventMove, handleResizeMove, isTouchEvent ? { passive: false } : false);
        document.addEventListener(eventEnd, handleResizeEnd);
    };

    resizeHandle.addEventListener('mousedown', startResize);
    resizeHandle.addEventListener('touchstart', startResize, { passive: false }); // passive:false чтобы работал stopPropagation и preventDefault если нужен
}


// --- Функции для массового смещения зданий ---

/**
 * Проверяет, возможно ли сместить все здания в указанном направлении, не выходя за пределы сетки.
 * @param {number} dx Смещение по X (1, -1, или 0).
 * @param {number} dy Смещение по Y (1, -1, или 0).
 * @returns {boolean} True, если смещение возможно.
 */
function canShiftAllBuildings(dx, dy) {
    if (state.buildings.length === 0) return false;

    for (const building of state.buildings) {
        const newX = building.x + dx;
        const newY = building.y + dy;
        const buildingWidth = building.width || building.size;
        const buildingHeight = building.height || building.size;

        if (newX < 0 || newX + buildingWidth > state.gridSize ||
            newY < 0 || newY + buildingHeight > state.gridSize) {
            return false;
        }
    }
    return true;
}

/**
 * Смещает все размещенные здания на указанное количество ячеек.
 * @param {number} dx Смещение по оси X.
 * @param {number} dy Смещение по оси Y.
 */
export function shiftAllBuildings(dx, dy) {
    if (!canShiftAllBuildings(dx, dy)) {
        alert(translations[state.currentLang]?.cannotShiftFurther || "Cannot shift buildings further.");
        return;
    }

    let requiresDistanceUpdate = false;

    // Обновление координат в объектах состояния
    state.buildings.forEach(building => {
        building.x += dx;
        building.y += dy;
        if (building.type === 'castle' || building.type === 'hellgates') {
            requiresDistanceUpdate = true;
        }
    });

    // Обновление DOM для каждого здания
    state.buildings.forEach(building => {
        updateBuilding(building); // Вызов локальной функции updateBuilding
    });

    // Обновление отображения расстояний, если необходимо
    if (state.showDistanceToHG && requiresDistanceUpdate) {
        updateCastleDistanceDisplay();
    }
}