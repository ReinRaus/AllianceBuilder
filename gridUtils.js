// gridUtils.js
// Этот модуль содержит утилитарные функции для управления основной сеткой строительства:
// ее первоначальная настройка (создание DOM-ячеек) и полная перерисовка всех зданий на ней.

import * as state from './state.js'; // Для доступа к gridSize, cellSize и массиву buildings
import { addBuildingToGrid } from './buildingManager.js'; // Зависимость для отрисовки каждого отдельного здания

/**
 * Инициализирует или обновляет HTML-структуру сетки.
 * Удаляет все существующие ячейки и создает новые на основе текущих
 * значений `state.gridSize` и `state.cellSize`.
 * Устанавливает CSS Grid свойства для корректного отображения.
 */
export function setupGrid() {
    const gridElement = document.getElementById('grid');
    if (!gridElement) {
        console.error("[gridUtils] Элемент #grid не найден в DOM.");
        return;
    }

    // Установка CSS переменных для grid-template-columns и grid-template-rows.
    // Это позволяет сетке динамически адаптироваться к изменениям gridSize.
    gridElement.style.gridTemplateColumns = `repeat(${state.gridSize}, ${state.cellSize}px)`;
    gridElement.style.gridTemplateRows = `repeat(${state.gridSize}, ${state.cellSize}px)`;

    // Очистка сетки от предыдущих DOM-элементов ячеек (если они были).
    // Это важно при изменении размера сетки, чтобы не накапливать старые ячейки.
    gridElement.innerHTML = '';

    // Создание и добавление новых DOM-элементов для каждой ячейки сетки.
    const totalCells = state.gridSize * state.gridSize;
    for (let i = 0; i < totalCells; i++) {
        const cellElement = document.createElement('div');
        cellElement.className = 'grid-cell'; // Класс для стилизации ячеек
        // Установка размеров ячейки через inline-стили, так как cellSize может меняться динамически (например, при масштабировании).
        cellElement.style.width = `${state.cellSize}px`;
        cellElement.style.height = `${state.cellSize}px`;
        gridElement.appendChild(cellElement);
    }
    // После вызова этой функции, сетка готова к размещению на ней зданий.
    // Размещенные здания будут отрисованы отдельно через redrawAllBuildings или addBuildingToGrid.
}

/**
 * Полностью перерисовывает все здания на сетке.
 * Эта функция необходима, когда происходят глобальные изменения,
 * требующие пересоздания DOM-представлений всех зданий (например, после загрузки состояния,
 * изменения cellSize, или если нужно принудительно обновить все).
 *
 * Процесс:
 * 1. Удаление всех существующих DOM-элементов зданий и их областей влияния с сетки.
 * 2. Итерация по массиву `state.buildings` и вызов `addBuildingToGrid` для каждого здания,
 *    чтобы заново создать и разместить его DOM-представление на сетке.
 */
export function redrawAllBuildings() {
    const gridElement = document.getElementById('grid');
    if (!gridElement) {
        console.error("[gridUtils] Элемент #grid не найден в DOM для перерисовки зданий.");
        return;
    }

    // Удаление всех элементов с классами 'building' или 'building-area' из сетки.
    // querySelectorAll возвращает NodeList, который можно итерировать с forEach.
    gridElement.querySelectorAll('.building, .building-area').forEach(el => el.remove());

    // Повторное добавление каждого здания из текущего состояния на сетку.
    // Функция addBuildingToGrid из buildingManager отвечает за создание корректного DOM для здания.
    state.buildings.forEach(building => {
        addBuildingToGrid(building);
    });
}