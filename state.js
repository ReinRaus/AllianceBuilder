// Состояние приложения
export let buildings = [];
export let selectedBuilding = null;
export let gridSize = 50;
export let cellSize = 24; // px
export let ghostBuilding = null; // { type, x, y, size, areaSize }
export let draggedType = null; // string, тип перетаскиваемого элемента с тулбара
export let currentLang = 'ru';
export let cursorGhostIcon = null; // DOM-элемент для иконки, следующей за курсором

// Функции-сеттеры для изменения состояния.
// Это хороший паттерн, если в будущем понадобится логика при изменении состояния.
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