// touchControls.js
// Этот модуль отвечает за реализацию сенсорного управления для элементов на сетке,
// таких как перемещение уже размещенных зданий и масштабирование сетки щипком (pinch-to-zoom).

import * as state from './state.js'; // Глобальное состояние (gridSize, cellSize, isMobileDragging и т.д.)
import { setupGrid, redrawAllBuildings } from './gridUtils.js'; // Для обновления сетки при масштабировании
import { selectBuilding, checkOverlap, updateBuilding } from './buildingManager.js'; // Управление объектами зданий
import { updateRotateButtonVisualState, updateCastleDistanceDisplay } from './uiManager.js'; // Обновление UI

// --- Сенсорное управление для отдельных зданий (перемещение) ---

/**
 * Добавляет обработчики сенсорных событий (`touchstart`, `touchmove`, `touchend`)
 * к DOM-элементу здания для реализации его перемещения по сетке.
 * @param {HTMLElement} buildingEl - DOM-элемент здания, к которому привязываются обработчики.
 * @param {Object} building - Объект здания из `state.buildings`, соответствующий этому DOM-элементу.
 */
export function addTouchHandlersToBuilding(buildingEl, building) {
    buildingEl.addEventListener('touchstart', (eStart) => {
        // Игнорируем начало перемещения существующего здания, если в данный момент
        // активно перетаскивание НОВОГО здания с мобильной панели инструментов.
        if (state.isMobileDragging) return;

        // Реагируем только на одно касание (перемещение одним пальцем)
        if (eStart.touches.length === 1) {
            // Если сетка повернута, сбрасываем поворот перед началом взаимодействия
            if (state.isGridRotated) {
                state.setIsGridRotated(false);
                document.querySelector('.grid-container')?.classList.remove('rotated');
                updateRotateButtonVisualState(); // Обновляем состояние кнопки поворота
            }

            selectBuilding(building.id); // Выделяем здание, которое начали перемещать

            const touchStart = eStart.touches[0]; // Данные первого касания
            // Начальные координаты для расчета смещения
            const startTouchX = touchStart.clientX;
            const startTouchY = touchStart.clientY;
            const startBuildingX = building.x; // Начальная позиция здания на сетке (в ячейках)
            const startBuildingY = building.y;
            // Текущие размеры здания (учитывая кастомные для deadzone)
            const currentBuildingWidth = building.width || building.size;
            const currentBuildingHeight = building.height || building.size;
            let moved = false; // Флаг, указывающий, было ли реальное перемещение

            // Обработчик перемещения пальца
            const handleTouchMove = (eMove) => {
                // Если изменилось количество касаний (например, начался pinch-zoom) или активен D&D с панели, прекращаем обработку
                if (eMove.touches.length !== 1 || state.isMobileDragging) {
                    cleanUpTouchMove();
                    return;
                }
                eMove.preventDefault(); // Предотвращаем стандартный скролл страницы при перетаскивании здания

                const touchMove = eMove.touches[0];
                // Расчет смещения в ячейках сетки, округление до ближайшей целой ячейки
                const deltaXGrid = Math.round((touchMove.clientX - startTouchX) / state.cellSize);
                const deltaYGrid = Math.round((touchMove.clientY - startTouchY) / state.cellSize);

                if (deltaXGrid !== 0 || deltaYGrid !== 0) moved = true; // Фиксируем, что было движение

                // Расчет новых координат с учетом границ сетки
                const newX = Math.max(0, Math.min(state.gridSize - currentBuildingWidth, startBuildingX + deltaXGrid));
                const newY = Math.max(0, Math.min(state.gridSize - currentBuildingHeight, startBuildingY + deltaYGrid));

                // Временно удаляем текущее здание из массива для корректной проверки перекрытия с остальными
                const originalIndex = state.buildings.findIndex(b => b.id === building.id);
                if (originalIndex === -1) { cleanUpTouchMove(); return; } // Безопасность
                const tempBuildingData = state.buildings.splice(originalIndex, 1)[0];

                if (!checkOverlap(newX, newY, currentBuildingWidth, currentBuildingHeight)) {
                    building.x = newX; // Обновляем координаты в объекте здания
                    building.y = newY;
                    updateBuilding(building); // Обновляем DOM-представление здания
                }
                state.buildings.splice(originalIndex, 0, tempBuildingData); // Возвращаем здание в массив
            };

            // Обработчик завершения касания (палец поднят)
            const handleTouchEnd = () => {
                cleanUpTouchMove();
                // Если здание было действительно перемещено и активен режим отображения расстояний
                if (moved && state.showDistanceToHG && (building.type === 'castle' || building.type === 'hellgates')) {
                    updateCastleDistanceDisplay(); // Обновляем отображаемые расстояния
                }
            };
            
            // Вспомогательная функция для удаления слушателей
            const cleanUpTouchMove = () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                document.removeEventListener('touchcancel', handleTouchEnd); // Также для системной отмены
            };

            // Добавляем слушатели на документ для отслеживания движения и отпускания пальца
            document.addEventListener('touchmove', handleTouchMove, { passive: false }); // passive:false для preventDefault
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('touchcancel', handleTouchEnd); // Обработка системной отмены жеста
        }
    }, { passive: true }); // passive:true для 'touchstart' здесь допустимо, т.к. e.preventDefault()
                           // вызывается внутри 'touchmove', если это действительно перетаскивание.
                           // Это позволяет другим жестам (например, pinch-zoom на контейнере) начаться,
                           // если пользователь не начал сразу двигать здание.
}


// --- Сенсорное управление для сетки (масштабирование щипком) ---

/**
 * Инициализирует функциональность масштабирования сетки с помощью жеста "щипок" (pinch-to-zoom)
 * на элементе-контейнере сетки.
 */
export function setupTouchPinchZoom() {
    const gridContainer = document.querySelector('.grid-container');
    if (!gridContainer) {
        console.error("[touchControls] Контейнер .grid-container не найден для pinch-zoom.");
        return;
    }

    let initialPinchDistance = 0; // Начальное расстояние между пальцами
    let initialCellSizeForPinch = state.cellSize; // Начальный размер ячейки при начале жеста
    let pinchRedrawTimeout;       // ID таймаута для дебаунсинга перерисовки сетки

    gridContainer.addEventListener('touchstart', (e) => {
        // Если сейчас идет перетаскивание здания с панели, не начинаем pinch-zoom
        if (state.isMobileDragging) return;
        // Начинаем отслеживать жест, если на экране два активных касания
        if (e.touches.length === 2) {
            e.preventDefault(); // Предотвращаем стандартное масштабирование страницы браузером
            // Расчет начального расстояния между двумя точками касания
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialCellSizeForPinch = state.cellSize; // Запоминаем текущий размер ячейки
        }
    }, { passive: false }); // passive:false для возможности вызова preventDefault

    gridContainer.addEventListener('touchmove', (e) => {
        if (state.isMobileDragging) return; // Игнорируем, если идет D&D с панели
        // Продолжаем обработку, если на экране все еще два активных касания
        if (e.touches.length === 2) {
            e.preventDefault(); // Предотвращаем скролл/зум страницы во время жеста
            const currentPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            if (initialPinchDistance > 0) { // Убедимся, что начальное расстояние было корректно установлено
                const scaleFactor = currentPinchDistance / initialPinchDistance; // Коэффициент масштабирования
                let newCellSize = initialCellSizeForPinch * scaleFactor;
                
                // Ограничиваем минимальный и максимальный размер ячейки для удобства и производительности
                newCellSize = Math.max(10, Math.min(60, newCellSize)); // Например, от 10px до 60px

                // Обновляем размер ячейки и перерисовываем сетку, если изменение достаточно значительное
                if (Math.abs(newCellSize - state.cellSize) > 0.5) { // Порог чувствительности
                    state.setCellSize(newCellSize);

                    // Дебаунсинг перерисовки: обновляем сетку не на каждое микро-движение,
                    // а с небольшой задержкой после последнего изменения.
                    clearTimeout(pinchRedrawTimeout);
                    pinchRedrawTimeout = setTimeout(() => {
                        setupGrid();          // Обновить HTML-структуру сетки с новым cellSize
                        redrawAllBuildings(); // Перерисовать все здания с новым cellSize
                    }, 50); // Задержка в мс
                }
            }
        }
    }, { passive: false });

    // Сброс initialPinchDistance, если количество пальцев изменилось (например, один палец убран)
    // Это предотвратит некорректный расчет scaleFactor при последующих жестах.
    gridContainer.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialPinchDistance = 0;
        }
    });
    gridContainer.addEventListener('touchcancel', (e) => {
         initialPinchDistance = 0;
    });
}