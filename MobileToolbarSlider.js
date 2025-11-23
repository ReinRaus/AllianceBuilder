// MobileToolbarSlider.js
// Компонент горизонтально прокручиваемой панели инструментов для мобильных устройств.
// Предоставляет быстрый доступ к выбору зданий для размещения и кнопкам массового смещения.

function MobileToolbarSlider() {
    // Получаем необходимые состояния и функции из глобальных контекстов React
    const { t } = React.useContext(LanguageContext); // Функция для локализации текста
    const {
        shiftAllBuildingsState,   // Функция из AppStateContext для смещения всех зданий
        mobileSelectedToolType,   // Тип текущего выбранного инструмента (здания)
        setMobileSelectedToolType,// Функция для установки/сброса выбранного инструмента
        isMobileView,             // Флаг, активен ли мобильный вид
        isGridRotated,            // Текущее состояние поворота сетки
        toggleGridRotation: toggleGridRotationApp, // Функция для переключения поворота (из App.js, переименована)
        setGhostBuilding          // Функция для управления "полным" призраком на сетке
    } = React.useContext(AppStateContext);

    // Получаем список всех доступных типов зданий из глобальной конфигурации
    const buildingTypes = Object.keys(window.appBuildingConfig);
    const sliderContentRef = React.useRef(null); // Ссылка на DOM-элемент контента слайдера (для будущих улучшений, например, кастомной прокрутки)

    // Обработчик выбора/отмены выбора инструмента (типа здания) на мобильной панели
    const handleToolSelect = (type) => {
        // Если сетка была повернута, сбрасываем поворот перед выбором нового инструмента
        if (isGridRotated) {
            toggleGridRotationApp(); // Вызываем функцию из AppStateContext
        }

        if (mobileSelectedToolType === type) {
            // Повторный тап на уже активный инструмент - отменяем выбор
            setMobileSelectedToolType(null);
            setGhostBuilding(null); // Также убираем "полный призрак" с сетки, если он был
        } else {
            // Выбор нового инструмента
            setMobileSelectedToolType(type);
            // "Полный призрак" на сетке будет установлен/обновлен компонентом Grid
            // при первом событии pointermove/hover над сеткой.
            // На всякий случай убираем предыдущий призрак, если он остался от другого инструмента.
            setGhostBuilding(null); 
        }
    };

    // Эффект для сброса выбранного инструмента, если:
    // - Вид переключается на десктопный.
    // - Инструмент был выбран, а затем пользователь открыл сайдбар
    //   (эта логика сброса при открытии сайдбара находится в App.js -> handleToggleSidebar).
    React.useEffect(() => {
        if (!isMobileView && mobileSelectedToolType) {
            setMobileSelectedToolType(null);
            setGhostBuilding(null);
        }
    }, [isMobileView, mobileSelectedToolType, setMobileSelectedToolType, setGhostBuilding]);

    // Компонент рендерится только если активен мобильный вид
    if (!isMobileView) {
        return null;
    }

    return (
        <div id="mobileToolbarSlider" className="mobile-tool-slider mobile-only">
            <div className="slider-content" ref={sliderContentRef}>
                {/* Рендерим кнопки для выбора каждого типа здания */}
                {buildingTypes.map(type => {
                    const config = window.appBuildingConfig[type];
                    // Пропускаем рендеринг, если для данного типа нет конфигурации (маловероятно, но безопасно)
                    if (!config) return null; 
                    
                    const isActive = mobileSelectedToolType === type; // Определяем, активен ли данный инструмент
                    const localizedName = t(type); // Получаем локализованное имя типа здания

                    return (
                        // Используем компонент BuildingIcon для консистентного отображения кнопок-иконок
                        <BuildingIcon
                            key={type} // Уникальный ключ для элементов списка React
                            type={type}
                            onClick={() => handleToolSelect(type)} // Обработчик выбора инструмента
                            isActive={isActive} // Передаем флаг активности для стилизации
                            ariaLabel={localizedName} // Для доступности (скринридеры)
                            title={localizedName}     // Всплывающая подсказка при наведении (для десктопной отладки)
                        />
                    );
                })}

                {/* Блок с кнопками массового смещения зданий */}
                {/* Обернут в div для возможной стилизации и отступов */}
                <div className="shift-controls-mobile" style={{display: 'flex', gap: 'inherit', marginLeft: 'auto'}}>
                    <button 
                        className="tool-slider-item shift-tool-icon" 
                        title={t('shiftUpTitle')} 
                        aria-label={t('shiftUpTitle')} 
                        onClick={() => shiftAllBuildingsState(0, -1)} // Вызов функции смещения из AppStateContext
                    >↑</button>
                    <button 
                        className="tool-slider-item shift-tool-icon" 
                        title={t('shiftDownTitle')} 
                        aria-label={t('shiftDownTitle')} 
                        onClick={() => shiftAllBuildingsState(0, 1)}
                    >↓</button>
                    <button 
                        className="tool-slider-item shift-tool-icon" 
                        title={t('shiftLeftTitle')} 
                        aria-label={t('shiftLeftTitle')} 
                        onClick={() => shiftAllBuildingsState(-1, 0)}
                    >←</button>
                    <button 
                        className="tool-slider-item shift-tool-icon" 
                        title={t('shiftRightTitle')} 
                        aria-label={t('shiftRightTitle')} 
                        onClick={() => shiftAllBuildingsState(1, 0)}
                    >→</button>
                </div>
            </div>
        </div>
    );
}

// Напоминание: Убедитесь, что ключи для локализации тултипов кнопок смещения
// (например, 'shiftUpTitle', 'shiftDownTitle' и т.д.)
// добавлены в ваш файл translations.js для всех поддерживаемых языков.