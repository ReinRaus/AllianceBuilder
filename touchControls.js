import * as state from './state.js';
import { setupGrid, redrawAllBuildings } from './gridUtils.js';
import { selectBuilding, checkOverlap, updateBuilding } from './buildingManager.js';
// POTENTIAL_ISSUE: updateCastleDistanceDisplay не импортирован, но может понадобиться при перемещении.

// --- Сенсорное управление для отдельных зданий ---

/**
 * Добавляет обработчики сенсорных событий для перемещения размещенного здания.
 * @param {HTMLElement} buildingEl DOM-элемент здания.
 * @param {Object} building Объект здания из state.buildings.
 */
export function addTouchHandlersToBuilding(buildingEl, building) {
    buildingEl.addEventListener('touchstart', (eStart) => {
        if (eStart.touches.length === 1) { // Только одно касание для перемещения
            if (state.isGridRotated) { // Сброс поворота сетки перед началом перетаскивания
                state.setIsGridRotated(false);
                document.querySelector('.grid-container').classList.remove('rotated');
                // POTENTIAL_ISSUE: Нужно вызвать updateRotateButtonVisualState() из uiManager.
            }
            selectBuilding(building.id);

            const touchStart = eStart.touches[0];
            const startTouchX = touchStart.clientX;
            const startTouchY = touchStart.clientY;
            const startBuildingX = building.x;
            const startBuildingY = building.y;
            const currentBuildingWidth = building.width || building.size;
            const currentBuildingHeight = building.height || building.size;
            let moved = false;

            const handleTouchMove = (eMove) => {
                if (eMove.touches.length !== 1) return; // Игнорировать, если изменилось кол-во пальцев
                eMove.preventDefault(); // Предотвратить скролл страницы при перетаскивании здания

                const touchMove = eMove.touches[0];
                const deltaXGrid = Math.round((touchMove.clientX - startTouchX) / state.cellSize);
                const deltaYGrid = Math.round((touchMove.clientY - startTouchY) / state.cellSize);

                if (deltaXGrid !==0 || deltaYGrid !==0) moved = true;

                const newX = Math.max(0, Math.min(state.gridSize - currentBuildingWidth, startBuildingX + deltaXGrid));
                const newY = Math.max(0, Math.min(state.gridSize - currentBuildingHeight, startBuildingY + deltaYGrid));

                // Временное удаление для проверки перекрытия
                const index = state.buildings.findIndex(b => b.id === building.id);
                const tempBuilding = state.buildings.splice(index, 1)[0];

                if (!checkOverlap(newX, newY, currentBuildingWidth, currentBuildingHeight)) {
                    building.x = newX;
                    building.y = newY;
                    updateBuilding(building); // Обновление DOM
                }
                state.buildings.splice(index, 0, tempBuilding); // Возврат в массив
            };

            const handleTouchEnd = () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                 // Если здание было перемещено и активен режим расстояний
                if (moved && state.showDistanceToHG && (building.type === 'castle' || building.type === 'hellgates')) {
                    // POTENTIAL_ISSUE: updateCastleDistanceDisplay не импортирована здесь.
                    // uiManager.updateCastleDistanceDisplay(); // Пример, если бы она была импортирована
                }
            };

            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        }
    }, { passive: true }); // passive:true для touchstart, чтобы не блокировать pinch-zoom, если он на том же элементе
}

// --- Сенсорное управление для сетки (масштабирование) ---

/** Инициализирует масштабирование сетки щипком (pinch-to-zoom). */
export function setupTouchPinchZoom() {
    const gridContainer = document.querySelector('.grid-container');
    if (!gridContainer) return;

    let initialDistance = 0;
    let initialCellSize = state.cellSize;
    let pinchTimeout; // Для дебаунсинга перерисовки

    gridContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) { // Если два пальца на экране
            e.preventDefault(); // Предотвратить стандартные действия (например, масштабирование страницы)
            initialDistance = Math.hypot( // Расстояние между пальцами
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialCellSize = state.cellSize; // Запоминаем начальный размер ячейки
        }
    }, { passive: false }); // passive:false, чтобы работал preventDefault

    gridContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) { // Если два пальца двигаются
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            if (initialDistance > 0) { // Убедимся, что начальное расстояние было установлено
                const scaleFactor = currentDistance / initialDistance; // Коэффициент масштабирования
                let newCellSize = initialCellSize * scaleFactor;
                // Ограничение минимального и максимального размера ячейки
                newCellSize = Math.max(8, Math.min(40, newCellSize));

                // Обновляем размер ячейки и перерисовываем сетку, если изменение существенное
                if (Math.abs(newCellSize - state.cellSize) > 0.5) { // Порог для обновления
                    state.setCellSize(newCellSize);

                    // Дебаунсинг, чтобы не перерисовывать слишком часто во время движения пальцев
                    clearTimeout(pinchTimeout);
                    pinchTimeout = setTimeout(() => {
                        setupGrid();          // Обновить структуру сетки (размеры ячеек)
                        redrawAllBuildings(); // Перерисовать все здания с новым cellSize
                    }, 50); // Задержка в миллисекундах
                }
            }
        }
    }, { passive: false });
}

/**
 * Заглушка для реализации перетаскивания зданий с панели инструментов на сенсорных устройствах.
 * Требует более сложной логики эмуляции drag-and-drop.
 */
export function setupTouchDragAndDrop() {
    // POTENTIAL_ISSUE: Данная функциональность не реализована.
    console.warn("setupTouchDragAndDrop: Touch drag-and-drop from toolbar is not yet fully implemented.");
}