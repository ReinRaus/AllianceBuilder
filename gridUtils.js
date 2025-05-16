import * as state from './state.js';
import { addBuildingToGrid } from './buildingManager.js'; // Зависимость от buildingManager для перерисовки

/**
 * Инициализирует или обновляет структуру HTML-сетки.
 * Создает ячейки сетки на основе текущих `gridSize` и `cellSize` из state.
 */
export function setupGrid() {
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `repeat(${state.gridSize}, ${state.cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${state.gridSize}, ${state.cellSize}px)`;

    grid.innerHTML = ''; // Очистка предыдущих ячеек
    for (let i = 0; i < state.gridSize * state.gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.style.width = `${state.cellSize}px`;
        cell.style.height = `${state.cellSize}px`;
        grid.appendChild(cell);
    }
}

/**
 * Полностью перерисовывает все здания на сетке.
 * Удаляет существующие DOM-элементы зданий и их областей,
 * затем добавляет их заново на основе данных из `state.buildings`.
 */
export function redrawAllBuildings() {
    const grid = document.getElementById('grid');
    // Удаление всех DOM-элементов зданий и их областей влияния
    grid.querySelectorAll('.building, .building-area').forEach(el => el.remove());

    // Повторное добавление каждого здания на сетку
    state.buildings.forEach(building => {
        addBuildingToGrid(building);
    });
}