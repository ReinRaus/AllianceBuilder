// state.js
// Этот модуль определяет и экспортирует глобальное состояние приложения.
// Все изменяемые данные, которые должны быть доступны из разных частей приложения,
// хранятся здесь. Использование сеттеров позволяет добавить логику или побочные эффекты
// при изменении состояния в будущем, если это потребуется.

// --- Основное состояние данных ---

/**
 * Массив объектов, представляющих все размещенные на сетке здания.
 * Каждый объект здания содержит его ID, тип, координаты, имя (если применимо)
 * и другие свойства, определенные в `buildingManager.js` при создании.
 * @type {Array<Object>}
 */
export let buildings = [];

/**
 * ID текущего выделенного здания на сетке или в списке.
 * `null`, если ни одно здание не выделено.
 * @type {string|null}
 */
export let selectedBuilding = null;

// --- Состояние конфигурации сетки ---

/**
 * Текущий размер сетки (количество ячеек по ширине и высоте).
 * Используется для генерации сетки и ограничения размещения зданий.
 * @type {number}
 */
export let gridSize = 50; // Значение по умолчанию

/**
 * Размер одной ячейки сетки в пикселях.
 * Влияет на визуальный масштаб сетки и зданий. Может изменяться (например, при масштабировании).
 * @type {number}
 */
export let cellSize = 24; // Значение по умолчанию в px

// --- Состояние, связанное с процессом Drag-and-Drop и размещением ---

/**
 * Объект, представляющий "полный призрак" здания, отображаемый на сетке
 * во время перетаскивания (как для десктопа, так и для мобильной эмуляции).
 * Содержит информацию о типе, координатах и размерах призрака.
 * `null`, если призрак не отображается.
 * @type {Object|null} Example: { type: string, x: number, y: number, size: number, areaSize: number }
 */
export let ghostBuilding = null;

/**
 * Тип здания, который в данный момент перетаскивается с панели инструментов (для десктопа)
 * или выбран для размещения (для мобильной эмуляции).
 * Ключ из `buildingConfig`. `null`, если ничего не перетаскивается/не выбрано.
 * @type {string|null}
 */
export let draggedType = null;

/**
 * Флаг, указывающий, активно ли в данный момент мобильное перетаскивание
 * (эмуляция D&D с панели на мобильных устройствах).
 * @type {boolean}
 */
export let isMobileDragging = false;

/**
 * DOM-элемент для маленькой иконки-призрака, следующей за курсором мыши
 * во время десктопного Drag-and-Drop.
 * `null`, если элемент не создан или не используется.
 * @type {HTMLElement|null}
 */
export let cursorGhostIcon = null;


// --- Состояние пользовательского интерфейса и настроек ---

/**
 * Текущий язык интерфейса (например, 'ru', 'en', 'de', 'pt_br').
 * Используется для получения локализованных строк из `config.js`.
 * @type {string}
 */
export let currentLang = 'ru'; // Язык по умолчанию

/**
 * Флаг, указывающий, повернута ли сетка на 45 градусов.
 * Влияет только на визуальное отображение, логика размещения работает с не повернутой сеткой.
 * @type {boolean}
 */
export let isGridRotated = false;

/**
 * Флаг, указывающий, должен ли отображаться режим "расстояние до Адских Врат"
 * вместо имен замков.
 * @type {boolean}
 */
export let showDistanceToHG = false;


// --- Функции-сеттеры для изменения состояния ---
// Предоставляют контролируемый интерфейс для модификации глобального состояния.

export function setBuildings(newBuildingsArray) {
    buildings = newBuildingsArray;
}

export function setSelectedBuilding(buildingId) {
    selectedBuilding = buildingId;
}

export function setGridSize(newSize) {
    gridSize = newSize;
}

export function setCellSize(newSize) {
    cellSize = newSize;
}

export function setGhostBuilding(ghostData) {
    ghostBuilding = ghostData;
}

export function setDraggedType(type) {
    draggedType = type;
}

export function setIsMobileDragging(isDragging) {
    isMobileDragging = isDragging;
}

export function setCurrentLang(langCode) {
    currentLang = langCode;
}

export function setCursorGhostIcon(iconElement) {
    cursorGhostIcon = iconElement;
}

export function setIsGridRotated(isRotated) {
    isGridRotated = isRotated;
}

export function setShowDistanceToHG(shouldShow) {
    showDistanceToHG = shouldShow;
}