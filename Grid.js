// Grid.js
// Компонент, отвечающий за отображение основной сетки для размещения зданий,
// а также за обработку "броска" (drop) новых зданий с панели инструментов (для десктопа)
// и размещения зданий по тапу/клику в мобильном режиме.

function Grid() {
    // Получаем необходимые состояния и функции из глобальных контекстов React
    const {
        gridSize,               // Текущий размер сетки (N x N ячеек)
        cellSize,               // Текущий размер ячейки в пикселях
        buildings,              // Массив всех размещенных зданий
        // selectedBuildingId,  // Не используется напрямую в Grid для логики drop/place, но нужен для рендера Building
        isGridRotated,          // Флаг, повернута ли сетка
        setGhostBuilding,       // Функция для установки/сброса данных "полного призрака"
        mobileSelectedToolType, // Тип здания, выбранный на мобильной панели для размещения
        setMobileSelectedToolType, // Функция для сброса выбранного мобильного инструмента
        addBuilding,            // Функция из AppStateContext для добавления нового здания
        isMobileView,           // Флаг, активен ли мобильный вид
        commonInteractionCleanup // Функция для сброса глобальных состояний взаимодействия
    } = React.useContext(AppStateContext);
    const { t } = React.useContext(LanguageContext); // Функция для локализации текста

    const gridRef = React.useRef(null); // Ссылка на DOM-элемент сетки (#grid)

    // --- Инициализация interact.js для Grid как Dropzone (для десктопного режима) ---
    React.useEffect(() => {
        const gridElement = gridRef.current;
        // Инициализируем dropzone только если:
        // - есть DOM-элемент сетки
        // - загружена библиотека interact.js
        // - НЕ активен мобильный вид (dropzone нужен только для десктопного D&D с тулбара)
        if (!gridElement || !window.interact || isMobileView) {
            // Если interactable был установлен ранее, а теперь условия не выполняются, отключаем его
            if (gridElement && window.interact.isSet(gridElement)) {
                window.interact(gridElement).unset(); // Удаляет все interact-настройки с элемента
            }
            return; // Выходим
        }

        const dropzoneInteractable = window.interact(gridElement)
            .dropzone({
                accept: '.toolbar-item[data-type]', // Принимаем только элементы с этим селектором (с десктопного тулбара)
                overlap: 0.1, // Небольшое пересечение элемента с зоной для активации drop
                listeners: {
                    activate(event) { // Срабатывает, когда начинается перетаскивание совместимого элемента где-либо
                        gridElement.classList.add('drop-active'); // Визуальный фидбек для активной зоны броска
                    },
                    dragenter(event) { // Перетаскиваемый элемент вошел в пределы сетки
                        gridElement.classList.add('drop-target');    // Подсветка сетки как цели
                        event.relatedTarget.classList.add('can-drop'); // Стиль для перетаскиваемого элемента
                        // Отображение "полного призрака" начнется в 'dragover'
                    },
                    dragover(event) { // Перетаскиваемый элемент движется над сеткой
                        // event.relatedTarget - это перетаскиваемый DOM-элемент (.toolbar-item)
                        const type = event.relatedTarget.dataset.type || event.interaction.draggedBuildingType;
                        const config = window.appBuildingConfig[type];

                        if (type && config) {
                            const rect = gridElement.getBoundingClientRect();
                            // Координаты курсора относительно сетки (event.pageX/pageY - координаты на странице)
                            const x = Math.floor((event.pageX - rect.left - window.scrollX) / cellSize);
                            const y = Math.floor((event.pageY - rect.top - window.scrollY) / cellSize);

                            const placementSize = config.size;
                            // Корректируем координаты, чтобы призрак не выходил за сетку
                            const finalX = Math.max(0, Math.min(gridSize - placementSize, x));
                            const finalY = Math.max(0, Math.min(gridSize - placementSize, y));

                            // Проверка наложения призрака с существующими зданиями
                            let isInvalid = false;
                            for (const b of window.AppContextSnapshot.buildings) { // Используем снимок состояния
                                const bConf = window.appBuildingConfig[b.type];
                                const bWidth = b.width || (bConf?.size || 1);
                                const bHeight = b.height || (bConf?.size || 1);
                                if (finalX < b.x + bWidth && finalX + placementSize > b.x &&
                                    finalY < b.y + bHeight && finalY + placementSize > b.y) {
                                    isInvalid = true;
                                    break;
                                }
                            }
                            // Обновляем состояние призрака, которое подхватит компонент BuildingGhost
                            setGhostBuilding({ type, x: finalX, y: finalY, size: placementSize, areaSize: config.areaSize, isInvalidPosition: isInvalid });
                        }
                    },
                    dragleave(event) { // Перетаскиваемый элемент покинул пределы сетки
                        gridElement.classList.remove('drop-target');
                        if (event.relatedTarget) event.relatedTarget.classList.remove('can-drop');
                        setGhostBuilding(null); // Убираем "полный призрак"
                    },
                    drop(event) { // Элемент "брошен" на сетку
                        const draggableElement = event.relatedTarget;
                        const type = draggableElement.dataset.type || event.interaction.draggedBuildingType;
                        const config = window.appBuildingConfig[type];

                        if (type && config) {
                            const rect = gridElement.getBoundingClientRect();
                            const dropX = Math.floor((event.pageX - rect.left - window.scrollX) / cellSize);
                            const dropY = Math.floor((event.pageY - rect.top - window.scrollY) / cellSize);

                            const placementSize = config.size;
                            const finalX = Math.max(0, Math.min(gridSize - placementSize, dropX));
                            const finalY = Math.max(0, Math.min(gridSize - placementSize, dropY));

                            // Финальная проверка наложения перед созданием здания
                            let overlap = false;
                            for (const b of window.AppContextSnapshot.buildings) {
                                const bConf = window.appBuildingConfig[b.type];
                                const bWidth = b.width || (bConf?.size || 1);
                                const bHeight = b.height || (bConf?.size || 1);
                                if (finalX < b.x + bWidth && finalX + placementSize > b.x &&
                                    finalY < b.y + bHeight && finalY + placementSize > b.y) {
                                    overlap = true;
                                    break;
                                }
                            }

                            if (!overlap) {
                                // Имя для замка генерируется в App.js -> addBuilding
                                addBuilding({ type, x: finalX, y: finalY });
                            } else {
                                alert(t('cannotOverlapMsg'));
                            }
                        }
                    },
                    deactivate(event) { // Перетаскивание завершено (успешно или нет), и элемент больше не над зоной
                        gridElement.classList.remove('drop-active', 'drop-target');
                        if (event.relatedTarget) event.relatedTarget.classList.remove('can-drop');
                        setGhostBuilding(null); // Гарантированно убираем призрак
                    }
                }
            });

        return () => { // Очистка при размонтировании или изменении isMobileView
            if (window.interact.isSet(gridElement)) {
                window.interact(gridElement).unset();
            }
        };
    // Зависимости: isMobileView (для включения/выключения dropzone), cellSize, gridSize (для расчетов),
    // addBuilding, setGhostBuilding, t (для сообщений).
    // window.AppContextSnapshot.buildings НЕ включаем, чтобы не пересоздавать interactable часто.
    }, [isMobileView, cellSize, gridSize, addBuilding, setGhostBuilding, t]);


    // --- Обработчики для мобильного размещения (тап/перемещение по сетке после выбора инструмента) ---
    React.useEffect(() => {
        const gridElement = gridRef.current;
        // Навешиваем обработчики только если:
        // - есть DOM-элемент сетки
        // - загружена библиотека interact.js
        // - активен мобильный вид
        // - выбран какой-либо инструмент для размещения
        if (!gridElement || !window.interact || !isMobileView || !mobileSelectedToolType) {
            // Если условия не выполняются, а слушатели были ранее установлены, удаляем их.
            // Флаг mobileListenersSet используется для предотвращения повторного удаления.
            if (gridElement.mobileListenersSet && window.interact.isSet(gridElement)) {
                 window.interact(gridElement).off('pointermove', handleMobileGridHoverForPlacement);
                 window.interact(gridElement).off('pointerleave', handleMobileGridLeaveForPlacement);
                 window.interact(gridElement).off('tap', handleMobileGridTapForPlacement);
                 gridElement.mobileListenersSet = false;
            }
            // Если инструмент не выбран, также убираем призрак
            if (!mobileSelectedToolType) setGhostBuilding(null);
            return;
        }

        // Обработчик перемещения пальца/мыши НАД сеткой в режиме мобильного размещения
        const handleMobileGridHoverForPlacement = (event) => {
            if (!mobileSelectedToolType) return; // Двойная проверка
            const config = window.appBuildingConfig[mobileSelectedToolType];
            if (!config) return;

            const rect = gridElement.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left) / cellSize); // event.clientX/Y доступны и для pointer событий
            const y = Math.floor((event.clientY - rect.top) / cellSize);
            const placementSize = config.size;
            
            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) { // Если курсор/палец внутри сетки
                const finalX = Math.max(0, Math.min(gridSize - placementSize, x));
                const finalY = Math.max(0, Math.min(gridSize - placementSize, y));
                
                let isInvalid = false; // Проверка наложения для призрака
                for (const b of window.AppContextSnapshot.buildings) {
                    const bConf = window.appBuildingConfig[b.type];
                    const bWidth = b.width || (bConf?.size || 1);
                    const bHeight = b.height || (bConf?.size || 1);
                    if (finalX < b.x + bWidth && finalX + placementSize > b.x &&
                        finalY < b.y + bHeight && finalY + placementSize > b.y) {
                        isInvalid = true;
                        break;
                    }
                }
                setGhostBuilding({ type: mobileSelectedToolType, x: finalX, y: finalY, size: placementSize, areaSize: config.areaSize, isInvalidPosition: isInvalid });
            } else {
                setGhostBuilding(null); // Убираем призрак, если палец/мышь вне сетки
            }
        };

        // Обработчик ухода пальца/мыши с сетки
        const handleMobileGridLeaveForPlacement = () => {
             if (mobileSelectedToolType) setGhostBuilding(null);
        };

        // Обработчик "тапа" или клика на сетку для размещения выбранного здания
        const handleMobileGridTapForPlacement = (event) => {
            if (!mobileSelectedToolType) return; // Если инструмент уже сброшен, ничего не делаем
            const config = window.appBuildingConfig[mobileSelectedToolType];
            if (!config) return;

            const rect = gridElement.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left) / cellSize);
            const y = Math.floor((event.clientY - rect.top) / cellSize);
            const placementSize = config.size;

            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) { // Если тап внутри сетки
                const finalX = Math.max(0, Math.min(gridSize - placementSize, x));
                const finalY = Math.max(0, Math.min(gridSize - placementSize, y));
                
                let overlap = false; // Финальная проверка наложения
                for (const b of window.AppContextSnapshot.buildings) {
                    const bConf = window.appBuildingConfig[b.type];
                    const bWidth = b.width || (bConf?.size || 1);
                    const bHeight = b.height || (bConf?.size || 1);
                    if (finalX < b.x + bWidth && finalX + placementSize > b.x &&
                        finalY < b.y + bHeight && finalY + placementSize > b.y) {
                        overlap = true;
                        break;
                    }
                }

                if (!overlap) {
                    // Имя для замка будет сгенерировано в App.js -> addBuilding
                    addBuilding({ type: mobileSelectedToolType, x: finalX, y: finalY });
                } else {
                    alert(t('cannotOverlapMsg'));
                }
            }
            // Сбрасываем выбранный инструмент и призрак ПОСЛЕ попытки размещения
            setMobileSelectedToolType(null); 
            setGhostBuilding(null);
            // Класс 'active' на кнопке инструмента в MobileToolbarSlider должен сняться автоматически
            // из-за изменения mobileSelectedToolType и перерендеринга MobileToolbarSlider
        };

        // Навешиваем обработчики на сетку, используя pointer-события для универсальности (touch + mouse)
        // и 'tap' от interact.js для обработки клика/тапа.
        // Устанавливаем флаг, что слушатели были добавлены, чтобы избежать их повторного добавления.
        if (!gridElement.mobileListenersSet) {
            window.interact(gridElement).on('pointermove', handleMobileGridHoverForPlacement);
            window.interact(gridElement).on('pointerleave', handleMobileGridLeaveForPlacement);
            window.interact(gridElement).on('tap', handleMobileGridTapForPlacement);
            gridElement.mobileListenersSet = true;
        }

        return () => { // Очистка при размонтировании или изменении зависимостей
            if (window.interact.isSet(gridElement) && gridElement.mobileListenersSet) {
                window.interact(gridElement).off('pointermove', handleMobileGridHoverForPlacement);
                window.interact(gridElement).off('pointerleave', handleMobileGridLeaveForPlacement);
                window.interact(gridElement).off('tap', handleMobileGridTapForPlacement);
                gridElement.mobileListenersSet = false;
            }
        };
    // Зависимости: isMobileView, mobileSelectedToolType (для активации/деактивации этих слушателей),
    // cellSize, gridSize, addBuilding, setGhostBuilding, t, setMobileSelectedToolType.
    }, [isMobileView, mobileSelectedToolType, cellSize, gridSize, addBuilding, setGhostBuilding, t, setMobileSelectedToolType]);


    // --- Рендеринг сетки, ячеек и зданий ---
    const gridStyle = {
        gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
        position: 'relative', // Необходимо для абсолютного позиционирования дочерних элементов
    };

    // Генерируем массив DOM-элементов ячеек сетки
    // Использование React.useMemo здесь может быть полезно, если gridSize не меняется часто,
    // чтобы избежать пересоздания массива ячеек на каждый рендер Grid.
    const cells = React.useMemo(() => {
        const cellArray = [];
        for (let i = 0; i < gridSize * gridSize; i++) {
            cellArray.push(<div key={`cell-${i}`} className="grid-cell" style={{ width: cellSize, height: cellSize }}></div>);
        }
        return cellArray;
    }, [gridSize, cellSize]);

    return (
        <div className={`grid-container ${isGridRotated ? 'rotated' : ''}`}>
            <div id="grid" ref={gridRef} className="grid" style={gridStyle}>
                {cells}
                {buildings.map(building => (
                    // Каждый элемент Building сам управляет своим interact.js для D&D и resize
                    <Building key={building.id} buildingData={building} />
                ))}
                {/* Компонент BuildingGhost отобразит призрак, если ghostBuilding в состоянии не null */}
                <BuildingGhost />
            </div>
        </div>
    );
}