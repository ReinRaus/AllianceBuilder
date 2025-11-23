// Building.js
// Компонент для отображения одного размещенного здания на сетке.
// Отвечает за его перетаскивание и изменение размера (для deadzone) с помощью interact.js.

function Building({ buildingData }) {
    // Получаем необходимые состояния и функции из контекстов
    const { 
        cellSize, 
        gridSize, 
        selectedBuildingId, 
        setSelectedBuildingId,
        updateBuildingState,    // Функция для обновления x, y, width, height здания в AppState
        showDistanceToHG,       // Флаг, показывать ли расстояние до Адских Врат
        isGridRotated,          // Текущее состояние поворота сетки
        toggleGridRotation,     // Функция для переключения состояния поворота сетки
        commonInteractionCleanup // Функция для сброса "конфликтующих" состояний
    } = React.useContext(AppStateContext);
    const { t } = React.useContext(LanguageContext); // Функция для локализации

    const buildingRef = React.useRef(null); // Ссылка на DOM-элемент здания для interact.js

    // Деструктуризация данных о здании для удобства
    const { id, type, x, y, playerName, areaSize } = buildingData;
    const config = window.appBuildingConfig[type]; // Получаем статическую конфигурацию для этого типа здания

    if (!config) {
        console.error(`[Building] Не найдена конфигурация для типа здания: ${type}`);
        return null; // Не рендерим, если нет конфигурации
    }

    // Определяем текущие размеры здания (в ячейках)
    // Для DeadZone размеры берутся из buildingData (могут быть изменены пользователем),
    // для остальных зданий - из статической конфигурации (config.size).
    const currentWidthInCells = type === window.appConstants.BUILDING_TYPES.DEADZONE ? (buildingData.width || config.size) : config.size;
    const currentHeightInCells = type === window.appConstants.BUILDING_TYPES.DEADZONE ? (buildingData.height || config.size) : config.size;

    // --- Инициализация interact.js для перетаскивания и изменения размера ---
    React.useEffect(() => {
        const targetElement = buildingRef.current;
        if (!targetElement || !window.interact) return; // Выходим, если нет элемента или interact.js

        // Вспомогательная функция для проверки наложения с другими зданиями
        const checkOverlapWithOthers = (currentId, targetX, targetY, targetWidth, targetHeight) => {
            const otherBuildings = window.AppContextSnapshot.buildings.filter(b => b.id !== currentId);
            for (const otherB of otherBuildings) {
                const otherConf = window.appBuildingConfig[otherB.type];
                const otherW = otherB.width || (otherConf?.size || 1);
                const otherH = otherB.height || (otherConf?.size || 1);
                if (targetX < otherB.x + otherW && targetX + targetWidth > otherB.x &&
                    targetY < otherB.y + otherH && targetY + targetHeight > otherB.y) {
                    return true; // Найдено перекрытие
                }
            }
            return false; // Перекрытий нет
        };
        
        // 1. Настройка Draggable (перетаскивание)
        const draggableInstance = window.interact(targetElement)
            .draggable({
                inertia: false, // Отключаем инерцию для точного позиционирования по сетке
                modifiers: [
                    // Ограничение движения границами родительского элемента (сетки)
                    window.interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: false // Ограничивать постоянно во время перетаскивания
                    })
                ],
                autoScroll: { // Автопрокрутка контейнера .grid-container
                    container: targetElement.closest('.grid-container'),
                    margin: 50,
                    speed: 300
                },
                listeners: {
                    start(event) {
                        commonInteractionCleanup(); // Сбрасываем другие активные режимы
                        if (isGridRotated) {
                            toggleGridRotation(); // Сбрасываем поворот сетки
                        }
                        targetElement.classList.add('dragging'); // Визуальный фидбек
                        if (id !== selectedBuildingId) {
                            setSelectedBuildingId(id); // Выделяем здание, если оно еще не выделено
                        }
                        // Сохраняем начальные координаты здания (в ячейках) из buildingData
                        targetElement.dataset.startX = buildingData.x;
                        targetElement.dataset.startY = buildingData.y;
                    },
                    move(event) {
                        const startXCells = parseFloat(targetElement.dataset.startX);
                        const startYCells = parseFloat(targetElement.dataset.startY);
                        // Суммарное смещение от начальной точки касания/клика (в пикселях)
                        const totalDxPixels = event.pageX - event.x0; 
                        const totalDyPixels = event.pageY - event.y0;

                        // Новые предполагаемые координаты в пикселях относительно начала сетки
                        let newPixelX = (startXCells * cellSize) + totalDxPixels;
                        let newPixelY = (startYCells * cellSize) + totalDyPixels;

                        // Переводим в ячейки сетки и округляем
                        let newGridX = Math.round(newPixelX / cellSize);
                        let newGridY = Math.round(newPixelY / cellSize);
                        
                        // Окончательная проверка на выход за границы сетки (в ячейках)
                        newGridX = Math.max(0, Math.min(gridSize - currentWidthInCells, newGridX));
                        newGridY = Math.max(0, Math.min(gridSize - currentHeightInCells, newGridY));

                        // Проверка наложения с другими зданиями
                        if (!checkOverlapWithOthers(id, newGridX, newGridY, currentWidthInCells, currentHeightInCells)) {
                            // Визуально перемещаем элемент с помощью transform для плавности.
                            // Смещение рассчитывается относительно начальной позиции в ячейках (buildingData.x/y),
                            // а не от текущей позиции style.left/top, чтобы избежать накопления ошибок.
                            targetElement.style.transform = `translate(${newGridX * cellSize - buildingData.x * cellSize}px, ${newGridY * cellSize - buildingData.y * cellSize}px)`;
                            // Сохраняем новые целевые координаты (в ячейках) для использования в событии 'end'
                            targetElement.dataset.finalGridX = newGridX;
                            targetElement.dataset.finalGridY = newGridY;
                        } else {
                            // Если есть наложение, не обновляем transform и dataset.finalGridX/Y,
                            // элемент визуально останется на предыдущей валидной позиции (или начнет "дергаться").
                            // Для более плавного поведения можно было бы не давать ему заходить на невалидную позицию.
                        }
                    },
                    end(event) {
                        targetElement.classList.remove('dragging');
                        targetElement.style.transform = 'translate(0px, 0px)'; // Сбрасываем transform после перетаскивания

                        // Получаем финальные координаты из dataset (если они были установлены после валидного move)
                        const finalGridX = parseFloat(targetElement.dataset.finalGridX);
                        const finalGridY = parseFloat(targetElement.dataset.finalGridY);

                        // Очищаем data-атрибуты
                        delete targetElement.dataset.startX;
                        delete targetElement.dataset.startY;
                        delete targetElement.dataset.finalGridX;
                        delete targetElement.dataset.finalGridY;

                        // Обновляем глобальное состояние React только если координаты действительно изменились
                        // и были успешно сохранены в dataset (т.е. последний move был валидным).
                        if (!isNaN(finalGridX) && !isNaN(finalGridY) && 
                            (finalGridX !== buildingData.x || finalGridY !== buildingData.y)) {
                             updateBuildingState({ id, x: finalGridX, y: finalGridY });
                        } else if (finalGridX === buildingData.x && finalGridY === buildingData.y) {
                            // Координаты не изменились, ничего не делаем
                        } else {
                            // Если finalGridX/Y не числа (например, move не прошел проверку overlap и они не установились)
                            // то здание остается на старых координатах buildingData.x/y.
                            // Ничего обновлять в AppState не нужно.
                        }
                    }
                }
            });

        // 2. Настройка Resizable (только если isResizable === true в конфиге здания)
        let resizableInstance = null;
        if (config.isResizable) {
            resizableInstance = window.interact(targetElement)
                .resizable({
                    edges: { bottom: true, right: true, left: false, top: false }, // Ручки только справа и снизу
                    inertia: false,
                    modifiers: [
                        // Ограничение минимального размера (1x1 ячейка)
                        window.interact.modifiers.restrictSize({
                            min: { width: cellSize, height: cellSize },
                        }),
                        // Ограничение максимального размера краями родительской сетки
                        window.interact.modifiers.restrictEdges({
                            outer: 'parent',
                        })
                    ],
                    listeners: {
                        start(event) {
                            commonInteractionCleanup();
                            if (isGridRotated) toggleGridRotation();
                            targetElement.classList.add('resizing'); // Визуальный фидбек
                            if (id !== selectedBuildingId) setSelectedBuildingId(id);
                            // Сохраняем начальные размеры из buildingData для корректного расчета
                            targetElement.dataset.startWidthCells = currentWidthInCells;
                            targetElement.dataset.startHeightCells = currentHeightInCells;
                        },
                        move(event) {
                            const { width, height } = event.rect; // Новые размеры элемента в пикселях
                            
                            // Переводим в ячейки сетки, округляем, минимум 1х1
                            let newGridWidth = Math.max(1, Math.round(width / cellSize));
                            let newGridHeight = Math.max(1, Math.round(height / cellSize));

                            // Ограничение по границам сетки (здание не должно выходить за правый/нижний край)
                            newGridWidth = Math.min(newGridWidth, gridSize - buildingData.x);
                            newGridHeight = Math.min(newGridHeight, gridSize - buildingData.y);

                            // Проверка наложения с другими зданиями при новом размере
                            if (!checkOverlapWithOthers(id, buildingData.x, buildingData.y, newGridWidth, newGridHeight)) {
                                // Визуально обновляем размеры элемента
                                targetElement.style.width = `${newGridWidth * cellSize}px`;
                                targetElement.style.height = `${newGridHeight * cellSize}px`;
                                // Сохраняем новые целевые размеры (в ячейках) для события 'end'
                                targetElement.dataset.finalGridWidth = newGridWidth;
                                targetElement.dataset.finalGridHeight = newGridHeight;
                            }
                        },
                        end(event) {
                            targetElement.classList.remove('resizing');
                            const finalGridWidth = parseFloat(targetElement.dataset.finalGridWidth);
                            const finalGridHeight = parseFloat(targetElement.dataset.finalGridHeight);

                            delete targetElement.dataset.startWidthCells;
                            delete targetElement.dataset.startHeightCells;
                            delete targetElement.dataset.finalGridWidth;
                            delete targetElement.dataset.finalGridHeight;

                            // Обновляем состояние React, если размеры действительно изменились
                            if (!isNaN(finalGridWidth) && !isNaN(finalGridHeight) &&
                                (finalGridWidth !== currentWidthInCells || finalGridHeight !== currentHeightInCells)) {
                                updateBuildingState({ id, width: finalGridWidth, height: finalGridHeight });
                            }
                        }
                    }
                });
        }

        // Функция очистки: удаляет все interact-обработчики при размонтировании компонента
        return () => {
            if (window.interact.isSet(targetElement)) {
                window.interact(targetElement).unset(); // Удаляет все обработчики (draggable, resizable)
            }
        };
    }, [
        id, type, config, cellSize, gridSize, buildingData.x, buildingData.y, // Основные данные
        currentWidthInCells, currentHeightInCells, // Для правильных расчетов
        updateBuildingState, setSelectedBuildingId, selectedBuildingId, // Функции и состояния для взаимодействия
        isGridRotated, toggleGridRotation, commonInteractionCleanup, // Управление глобальными режимами
        // AppContextSnapshot.buildings не добавляем, чтобы не пересоздавать interactable слишком часто
    ]);

    // Обработчик клика на здание (для выделения)
    const handleClick = (e) => {
        e.stopPropagation(); // Предотвращаем всплытие до сетки (где может быть снятие выделения)
        commonInteractionCleanup(); // Сбрасываем другие режимы
        if (isGridRotated) {
            toggleGridRotation(); // Сбрасываем поворот, если был
        }
        setSelectedBuildingId(id); // Выделяем это здание
    };

    // Формируем стили для позиционирования и размеров здания
    const buildingStyle = {
        left: x * cellSize + 'px',
        top: y * cellSize + 'px',
        width: currentWidthInCells * cellSize + 'px',
        height: currentHeightInCells * cellSize + 'px',
        backgroundColor: type === window.appConstants.BUILDING_TYPES.DEADZONE ? config?.bgcolor :
                         type === window.appConstants.BUILDING_TYPES.CASTLE ? 'rgba(255, 255, 255, 0.75)' : // Чуть плотнее фон замка
                         'var(--color-background-content)', // Дефолтный фон
        // Рамка выделенного здания управляется через класс .selected
    };

    // Определяем, какой текст отображать на здании (имя или расстояние)
    let buildingNameContent = playerName;
    if (type === window.appConstants.BUILDING_TYPES.CASTLE && showDistanceToHG) {
        const buildingsFromSnapshot = window.AppContextSnapshot?.buildings || [];
        const hellGates = buildingsFromSnapshot.find(b => b.type === window.appConstants.BUILDING_TYPES.HELLGATES);
        if (hellGates) {
            const castleCenterX = x + currentWidthInCells / 2;
            const castleCenterY = y + currentHeightInCells / 2;
            const hgConf = window.appBuildingConfig[hellGates.type];
            const hgSize = hgConf?.size || 1;
            const hgCenterX = hellGates.x + hgSize / 2;
            const hgCenterY = hellGates.y + hgSize / 2;
            const distance = Math.sqrt(Math.pow(castleCenterX - hgCenterX, 2) + Math.pow(castleCenterY - hgCenterY, 2));
            buildingNameContent = distance.toFixed(1); // Только число
        } else {
            buildingNameContent = t('hellgatesNotPlaced');
        }
    }

    return (
        <React.Fragment>
            {/* Отображение области влияния, если она есть */}
            {config && areaSize > 0 && (
                <div
                    className="building-area"
                    style={{
                        left: (x - Math.floor((areaSize - config.size) / 2)) * cellSize + 'px',
                        top: (y - Math.floor((areaSize - config.size) / 2)) * cellSize + 'px',
                        width: areaSize * cellSize + 'px',
                        height: areaSize * cellSize + 'px',
                    }}
                />
            )}
            {/* Основной DOM-элемент здания */}
            <div
                ref={buildingRef}
                id={`building-${id}`}
                className={`building building-type-${type} ${selectedBuildingId === id ? 'selected' : ''}`}
                style={buildingStyle}
                onClick={handleClick} // Обработчик клика для выделения
                data-id={id} // data-id для возможного использования в тестах или JS
            >
                {/* Иконка (не для замка) */}
                {type !== window.appConstants.BUILDING_TYPES.CASTLE && config && 
                    <span className="icon">{config.icon}</span>
                }
                
                {/* Имя для замка (или расстояние) */}
                {type === window.appConstants.BUILDING_TYPES.CASTLE && buildingNameContent && (
                    <div className="player-castle-name">{buildingNameContent}</div>
                )}
                {/* Имя для мертвой зоны */}
                {type === window.appConstants.BUILDING_TYPES.DEADZONE && playerName && (
                    <div className="deadzone-name">{playerName}</div>
                )}

                {/* Ручка для изменения размера (только для DeadZone и если isResizable) */}
                {config && config.isResizable && <div className="resize-handle"></div>}
            </div>
        </React.Fragment>
    );
}