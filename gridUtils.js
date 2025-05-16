import * as state from './state.js';
import { addBuildingToGrid } from './buildingManager.js';

// Настройка сетки
export function setupGrid() {
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `repeat(${state.gridSize}, ${state.cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${state.gridSize}, ${state.cellSize}px)`;

    grid.innerHTML = '';
    for (let i = 0; i < state.gridSize * state.gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.style.width = `${state.cellSize}px`;
        cell.style.height = `${state.cellSize}px`;
        grid.appendChild(cell);
    }
}

// Перерисовка всех зданий
export function redrawAllBuildings() {
    const grid = document.getElementById('grid');
    // Удаление всех существующих зданий и областей с сетки
    grid.querySelectorAll('.building, .building-area').forEach(el => el.remove());
    // Повторное добавление всех зданий из массива state.buildings на сетку
    state.buildings.forEach(building => {
        addBuildingToGrid(building); // Эта функция уже знает про cellSize и т.д.
    });
}