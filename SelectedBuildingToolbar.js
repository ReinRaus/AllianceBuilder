// SelectedBuildingToolbar.js
// Панель инструментов, появляющаяся при выделении здания на сетке.
// Предоставляет контекстные действия для выделенного здания, такие как "Переименовать" и "Удалить".
// Видимость и активность кнопок зависят от того, какое здание выделено и его типа.

function SelectedBuildingToolbar() {
    // Получаем необходимые состояния и функции из глобальных контекстов React
    const { 
        selectedBuildingId,    // ID текущего выделенного здания
        buildings,             // Массив всех размещенных зданий
        deleteBuildingState,   // Функция из AppStateContext для удаления здания
        openRenameModal,       // Функция из AppStateContext для открытия модального окна переименования
        isMobileView           // Флаг, указывающий, активен ли мобильный вид (для CSS классов)
    } = React.useContext(AppStateContext);
    const { t } = React.useContext(LanguageContext); // Функция для локализации текста

    // Находим объект выделенного здания в массиве buildings.
    // React.useMemo используется для оптимизации: объект selectedBuilding
    // будет пересчитан только в том случае, если изменился массив buildings или selectedBuildingId.
    const selectedBuilding = React.useMemo(() => {
        if (!selectedBuildingId) return null; // Если ни одно здание не выделено, возвращаем null
        return buildings.find(b => b.id === selectedBuildingId);
    }, [buildings, selectedBuildingId]);

    // Определяем, доступно ли действие "Переименовать" для текущего выделенного здания.
    // Сначала получаем конфигурацию для типа выделенного здания.
    const buildingConfigForSelected = selectedBuilding ? window.appBuildingConfig[selectedBuilding.type] : null;
    // Затем проверяем флаг canRename из этой конфигурации.
    const canRenameThisBuilding = buildingConfigForSelected ? buildingConfigForSelected.canRename : false;

    // Обработчик для кнопки "Удалить"
    const handleDelete = () => {
        if (selectedBuilding) {
            // Формируем сообщение для подтверждения удаления, используя локализацию.
            // Если у здания есть имя, оно будет включено в сообщение.
            const confirmKey = selectedBuilding.playerName ? 'confirmDeleteNamedBuilding' : 'confirmDeleteBuilding';
            const buildingNameForConfirm = selectedBuilding.playerName || t(selectedBuilding.type);
            // Функция t теперь поддерживает простой плейсхолдер %NAME% (реализовано в App.js)
            const confirmMessage = t(confirmKey, { NAME: buildingNameForConfirm });
            
            if (window.confirm(confirmMessage)) { // Запрашиваем подтверждение у пользователя
                deleteBuildingState(selectedBuilding.id);
                // selectedBuildingId будет сброшен внутри deleteBuildingState в App.js,
                // что приведет к автоматическому скрытию этой панели (так как isVisible станет false).
            }
        }
    };

    // Обработчик для кнопки "Переименовать"
    const handleRename = () => {
        if (selectedBuilding && canRenameThisBuilding) {
            // Вызываем функцию из AppStateContext для открытия модального окна переименования,
            // передавая ID, текущее имя и тип выделенного здания.
            openRenameModal(selectedBuilding.id, selectedBuilding.playerName, selectedBuilding.type);
        }
    };
    
    // Определяем видимость панели: она видима, если есть выделенное здание.
    const isVisible = !!selectedBuilding;

    // Динамически формируем CSS-классы для панели.
    // 'visible' - управляет анимацией появления/скрытия.
    // 'mobile' - может использоваться для специфичных мобильных стилей, если .mobile-view на body недостаточно.
    let toolbarClasses = "selected-building-toolbar";
    if (isVisible) {
        toolbarClasses += " visible";
    }
    // Класс 'mobile' можно добавлять на основе isMobileView, если есть стили, которые не покрываются
    // общим `body.mobile-view .selected-building-toolbar`. В текущей CSS это уже сделано.
    // if (isMobileView) {
    //     toolbarClasses += " mobile"; 
    // }

    return (
        <div id="selectedBuildingToolbar" className={toolbarClasses} role="toolbar" aria-label={t('selectedBuildingActionsLabel') || "Actions for selected building"}>
            <button
                id="renameSelectedBuildingBtn"
                className="toolbar-action-btn"
                onClick={handleRename}
                disabled={!canRenameThisBuilding} // Кнопка неактивна, если переименование невозможно для этого типа
                title={canRenameThisBuilding ? t('rename') : t('renameNotAvailable')} // Информативный тултип
                aria-label={canRenameThisBuilding ? t('rename') : t('renameNotAvailable')}
            >
                <span className="icon" aria-hidden="true">✏️</span>
                {/* Текст кнопки будет скрыт на мобильных устройствах через CSS 
                    (правило `body.mobile-view .selected-building-toolbar .toolbar-action-btn .text`) */}
                <span className="text">{t('rename')}</span>
            </button>
            <button
                id="deleteSelectedBuildingBtn"
                className="toolbar-action-btn"
                onClick={handleDelete}
                disabled={!selectedBuilding} // Кнопка неактивна, если ни одно здание не выделено
                title={t('delete')}
                aria-label={t('delete')}
            >
                <span className="icon" aria-hidden="true">🗑️</span>
                <span className="text">{t('delete')}</span>
            </button>
        </div>
    );
}

// Убедитесь, что следующие ключи добавлены в translations.js для всех языков:
// - selectedBuildingActionsLabel: "Действия для выделенного здания" / "Actions for selected building"
// - renameNotAvailable: "Переименование недоступно" / "Rename not available"
// - confirmDeleteBuilding: "Удалить это здание?" / "Delete this building?"
// - confirmDeleteNamedBuilding: "Удалить «%NAME%»?" / "Delete '%NAME%'?"
// Ключи 'rename' и 'delete' уже должны быть.