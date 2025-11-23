// DesktopToolbar.js
// Компонент десктопной панели инструментов (сайдбара слева).
// Отображает список доступных зданий для перетаскивания на сетку
// и кнопки для массового смещения всех зданий.
// Использует interact.js для реализации Drag & Drop новых зданий.

function DesktopToolbar() {
    const { t } = React.useContext(LanguageContext);
    const { 
        shiftAllBuildingsState,
        isMobileView,
        isGridRotated,
        toggleGridRotation,     // Эта функция будет вызываться, но для теста ее можно убрать из зависимостей эффекта
        commonInteractionCleanup // Эта функция будет вызываться, но для теста ее можно убрать из зависимостей эффекта
    } = React.useContext(AppStateContext);

    const toolbarRef = React.useRef(null);
    // Ref для хранения массива созданных interactable инстансов.
    // Это помогает управлять их жизненным циклом и корректно очищать.
    const interactablesStoreRef = React.useRef([]);

    React.useEffect(() => {
        const currentToolbarNode = toolbarRef.current;
        if (!currentToolbarNode || !window.interact) {
            return;
        }

        // Функция для очистки всех interactable инстансов, сохраненных в interactablesStoreRef.
        const cleanupStoredInteractables = () => {
            interactablesStoreRef.current.forEach(instance => {
                if (instance && typeof instance.unset === 'function') {
                    instance.unset();
                }
            });
            interactablesStoreRef.current = []; // Очищаем массив после удаления инстансов
        };
        
        // Выполняем очистку предыдущих инстансов перед любой новой настройкой.
        cleanupStoredInteractables();

        // Если это мобильный вид, нам не нужно настраивать draggable элементы здесь.
        // Дополнительно пройдемся по элементам и убедимся, что на них нет interact.js,
        // на случай если они были добавлены другим способом (маловероятно, но для полноты).
        if (isMobileView) {
            const toolbarItems = Array.from(currentToolbarNode.querySelectorAll('.toolbar-item[data-type]'));
            toolbarItems.forEach(itemNode => {
                if (window.interact.isSet(itemNode)) {
                    window.interact(itemNode).unset();
                }
            });
            return; 
        }

        // Десктопный вид: настраиваем draggable для элементов.
        const itemsToMakeDraggable = Array.from(currentToolbarNode.querySelectorAll('.toolbar-item[data-type]'));
        const newlyCreatedInteractables = [];

        itemsToMakeDraggable.forEach(itemNode => {
            const type = itemNode.dataset.type;
            if (!type || !window.appBuildingConfig[type]) {
                return;
            }

            // Перед созданием нового interactable, на всякий случай проверяем и удаляем существующий,
            // если он каким-то образом остался на элементе.
            if (window.interact.isSet(itemNode)) {
                // console.warn(`[DesktopToolbar] Элемент ${type} был isSet перед новой инициализацией draggable.`);
                window.interact(itemNode).unset();
            }

            const interactableInstance = window.interact(itemNode)
                .draggable({
                    inertia: false,
                    autoScroll: true, // Можно попробовать закомментировать для теста, если ошибка связана с этим
                    listeners: {
                        start(event) {
                            // commonInteractionCleanup и toggleGridRotation вызываются, но не должны быть в зависимостях для этого теста
                            commonInteractionCleanup(); 
                            if (isGridRotated) {
                                toggleGridRotation();
                            }
                            
                            itemNode.classList.add('dragging-source');
                            // Важно проверять event.interaction перед доступом к нему
                            if (event.interaction) {
                                event.interaction.draggedBuildingType = type;
                            }
                        },
                        move(event) {
                            const target = event.target;
                            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                            target.style.transform = `translate(${x}px, ${y}px)`;
                            target.setAttribute('data-x', x);
                            target.setAttribute('data-y', y);
                        },
                        end(event) {
                            event.target.classList.remove('dragging-source');
                            event.target.style.transform = 'translate(0px, 0px)';
                            event.target.removeAttribute('data-x');
                            event.target.removeAttribute('data-y');
                            if (event.interaction) {
                                delete event.interaction.draggedBuildingType;
                            }
                        }
                    }
                });
            newlyCreatedInteractables.push(interactableInstance);
        });

        // Сохраняем вновь созданные инстансы в ref для последующей очистки.
        interactablesStoreRef.current = newlyCreatedInteractables;

        // Функция очистки для useEffect. Будет вызвана при размонтировании компонента
        // или перед следующим запуском этого эффекта.
        return () => {
            cleanupStoredInteractables();
        };
    // ДЛЯ ТЕСТА: оставляем только isMobileView в зависимостях.
    // Если ошибка исчезнет, значит, проблема была в частом перезапуске эффекта
    // из-за изменений isGridRotated, toggleGridRotation или commonInteractionCleanup.
    // }, [isMobileView, isGridRotated, toggleGridRotation, commonInteractionCleanup]);
    }, [isMobileView]); // ТЕСТОВАЯ ЗАВИСИМОСТЬ

    if (isMobileView) {
        return null;
    }

    return (
        <div className="toolbar desktop-only" id="toolbarDesktop" ref={toolbarRef}>
            <h2>{t('buildingsHeader')}</h2>
            {Object.keys(window.appBuildingConfig).map(typeKey => (
                <ToolbarItem key={typeKey} type={typeKey} />
            ))}
            <div className="shift-controls">
                <button 
                    id="shiftUpButtonDesktop" 
                    className="shift-btn" 
                    title={t('shiftUpTitle')} 
                    aria-label={t('shiftUpTitle')}
                    onClick={() => shiftAllBuildingsState(0, -1)}
                >↑</button>
                <button 
                    id="shiftDownButtonDesktop" 
                    className="shift-btn" 
                    title={t('shiftDownTitle')}
                    aria-label={t('shiftDownTitle')}
                    onClick={() => shiftAllBuildingsState(0, 1)}
                >↓</button>
                <button 
                    id="shiftLeftButtonDesktop" 
                    className="shift-btn" 
                    title={t('shiftLeftTitle')}
                    aria-label={t('shiftLeftTitle')}
                    onClick={() => shiftAllBuildingsState(-1, 0)}
                >←</button>
                <button 
                    id="shiftRightButtonDesktop" 
                    className="shift-btn" 
                    title={t('shiftRightTitle')}
                    aria-label={t('shiftRightTitle')}
                    onClick={() => shiftAllBuildingsState(1, 0)}
                >→</button>
            </div>
        </div>
    );
}