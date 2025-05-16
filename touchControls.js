import * as state from './state.js';
import { setupGrid, redrawAllBuildings } from './gridUtils.js';
import { selectBuilding, checkOverlap, updateBuilding } from './buildingManager.js';

// Добавляет обработчики касания для перемещения зданий
export function addTouchHandlersToBuilding(buildingEl, building) {
    buildingEl.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) { // Только для одного касания (перемещение)
            // e.preventDefault(); // Может мешать pinch-zoom, если неаккуратно
            selectBuilding(building.id);

            const touch = e.touches[0];
            const startTouchX = touch.clientX;
            const startTouchY = touch.clientY;
            const startBuildingX = building.x;
            const startBuildingY = building.y;

            const currentBuildingWidth = building.width || building.size;
            const currentBuildingHeight = building.height || building.size;


            const handleTouchMove = (moveEvent) => {
                if (moveEvent.touches.length !== 1) return;
                moveEvent.preventDefault(); // Предотвращаем скролл страницы при перетаскивании здания

                const touchMove = moveEvent.touches[0];
                const deltaXGrid = Math.round((touchMove.clientX - startTouchX) / state.cellSize);
                const deltaYGrid = Math.round((touchMove.clientY - startTouchY) / state.cellSize);

                const newX = Math.max(0, Math.min(state.gridSize - currentBuildingWidth, startBuildingX + deltaXGrid));
                const newY = Math.max(0, Math.min(state.gridSize - currentBuildingHeight, startBuildingY + deltaYGrid));

                const index = state.buildings.findIndex(b => b.id === building.id);
                const tempBuilding = state.buildings.splice(index, 1)[0];

                if (!checkOverlap(newX, newY, currentBuildingWidth, currentBuildingHeight)) {
                    building.x = newX;
                    building.y = newY;
                    updateBuilding(building);
                }
                state.buildings.splice(index, 0, tempBuilding);
            };

            const handleTouchEnd = () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            };

            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        }
    }, { passive: true }); // passive: true для touchstart, чтобы не блокировать pinch-zoom по умолчанию
                           // preventDefault вызывается внутри handleTouchMove если это действительно drag
}

// Настройка масштабирования щипком
export function setupTouchPinchZoom() {
    const gridContainer = document.querySelector('.grid-container');
    let initialDistance = 0;
    let initialCellSize = state.cellSize;
    let pinchTimeout;


    gridContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault(); // Важно для предотвращения стандартного поведения браузера
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialCellSize = state.cellSize;
        }
    }, { passive: false });

    gridContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            if (initialDistance > 0) { // Убедимся, что initialDistance было установлено
                const scaleFactor = currentDistance / initialDistance;
                let newCellSize = initialCellSize * scaleFactor;
                newCellSize = Math.max(8, Math.min(40, newCellSize)); // Ограничения размера ячейки

                if (Math.abs(newCellSize - state.cellSize) > 0.5) { // Порог для обновления
                    state.setCellSize(newCellSize);
                    
                    // Дебаунсинг для redraw, чтобы не перерисовывать слишком часто
                    clearTimeout(pinchTimeout);
                    pinchTimeout = setTimeout(() => {
                        setupGrid();
                        redrawAllBuildings();
                    }, 50); // Задержка в мс
                }
            }
        }
    }, { passive: false });
}

// TODO: Реализация setupTouchDragAndDrop (перетаскивание с панели на тач-устройствах)
// Это сложная задача, требующая эмуляции drag-and-drop или использования кастомной логики
// для "поднятия" элемента с панели и "бросания" его на сетку.
export function setupTouchDragAndDrop() {
    console.warn("setupTouchDragAndDrop: Touch drag-and-drop from toolbar is not yet fully implemented.");
    // Возможный подход:
    // 1. На 'touchstart' на элементе тулбара:
    //    - Создать визуальный клон элемента, следующий за пальцем.
    //    - Запомнить тип здания.
    // 2. На 'touchmove':
    //    - Перемещать клон.
    //    - Если палец над сеткой, показывать "призрак" здания на сетке.
    // 3. На 'touchend':
    //    - Если палец над сеткой и место допустимо, создать здание.
    //    - Удалить клон.
}