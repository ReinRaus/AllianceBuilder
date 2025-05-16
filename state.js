// --- Глобальное состояние приложения ---

/** @type {Array<Object>} Массив объектов размещенных зданий. */
export let buildings = [];
/** @type {string|null} ID выделенного в данный момент здания. */
export let selectedBuilding = null;

/** @type {number} Текущий размер сетки (количество ячеек по ширине/высоте). */
export let gridSize = 50;
/** @type {number} Размер одной ячейки сетки в пикселях. */
export let cellSize = 24;

/** @type {Object|null} Объект, представляющий "призрак" здания при перетаскивании на сетку.
 * Содержит: { type, x, y, size, areaSize }
 */
export let ghostBuilding = null;
/** @type {string|null} Тип здания, перетаскиваемого с панели инструментов. */
export let draggedType = null;

/** @type {string} Текущий язык интерфейса (например, 'ru', 'en'). */
export let currentLang = 'ru';
/** @type {HTMLElement|null} DOM-элемент для иконки-призрака, следующей за курсором. */
export let cursorGhostIcon = null;

/** @type {boolean} Флаг, указывающий, повернута ли сетка. */
export let isGridRotated = false;
/** @type {boolean} Флаг, указывающий, включен ли режим отображения расстояния до Адских Врат. */
export let showDistanceToHG = false;


// --- Функции-сеттеры для изменения состояния ---
// Использование сеттеров позволяет инкапсулировать логику изменения состояния,
// если в будущем потребуется добавить какие-либо проверки или побочные эффекты.

export function setBuildings(newBuildings) {
    buildings = newBuildings;
}
export function setSelectedBuilding(newSelectedBuilding) {
    selectedBuilding = newSelectedBuilding;
}
export function setGridSize(newGridSize) {
    gridSize = newGridSize;
}
export function setCellSize(newCellSize) {
    cellSize = newCellSize;
}
export function setGhostBuilding(newGhostBuilding) {
    ghostBuilding = newGhostBuilding;
}
export function setDraggedType(newDraggedType) {
    draggedType = newDraggedType;
}
export function setCurrentLang(newCurrentLang) {
    currentLang = newCurrentLang;
}
export function setCursorGhostIcon(newCursorGhostIcon) {
    cursorGhostIcon = newCursorGhostIcon;
}
export function setIsGridRotated(rotated) {
    isGridRotated = rotated;
}
export function setShowDistanceToHG(show) {
    showDistanceToHG = show;
}