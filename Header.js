// Header.js
// Компонент шапки (верхней панели) приложения.
// Отображает заголовок, кнопку открытия мобильного сайдбара (на мобильных),
// а также набор элементов управления для десктопной версии:
// - Кнопка "Поделиться ссылкой"
// - Управление размером сетки
// - Кнопки переключения режимов (поворот сетки, расстояние до Адских Врат)
// - Переключатель языков

function Header() {
    // Получаем необходимые состояния и функции из контекстов React
    const { 
        t,                // Функция для локализации текста
        currentLang,      // Текущий выбранный язык
        switchLanguage    // Функция для смены языка
    } = React.useContext(LanguageContext);

    const { 
        gridSize,             // Текущий размер сетки
        setGridSize,          // Функция для установки нового размера сетки (из AppStateContext)
        handleSaveState,      // Функция для сохранения состояния и генерации ссылки
        toggleGridRotation,   // Функция для переключения режима поворота сетки
        toggleDistanceToHG,   // Функция для переключения режима "расстояние до Адских Врат"
        isGridRotated,        // Флаг, повернута ли сетка
        showDistanceToHG,     // Флаг, активен ли режим расстояний
        isMobileView,         // Флаг, активен ли мобильный вид
        onToggleSidebar       // Функция для открытия/закрытия мобильного сайдбара
    } = React.useContext(AppStateContext);

    // Локальное состояние для поля ввода размера сетки (только для десктопной версии хедера).
    // Это позволяет пользователю вводить значение без немедленного обновления глобального состояния,
    // обновление происходит по Blur или Enter.
    const [localDesktopGridSize, setLocalDesktopGridSize] = React.useState(gridSize.toString());

    // Синхронизируем локальное состояние инпута с глобальным gridSize,
    // если gridSize изменился извне (например, из мобильного сайдбара или при загрузке состояния).
    React.useEffect(() => {
        setLocalDesktopGridSize(gridSize.toString());
    }, [gridSize]);

    // Обработчик изменения значения в поле ввода размера сетки
    const handleDesktopGridSizeInputChange = (e) => {
        setLocalDesktopGridSize(e.target.value);
    };

    // Функция применения нового размера сетки, введенного в десктопный инпут
    const applyDesktopGridSize = () => {
        const newSize = parseInt(localDesktopGridSize, 10);
        // setGridSize из AppStateContext содержит логику валидации
        setGridSize(newSize); 
    };

    return (
        <header>
            {/* Кнопка-гамбургер для открытия мобильного сайдбара (видна только на мобильных) */}
            {isMobileView && (
                <button 
                    id="openSidebarBtn" 
                    className="hamburger-btn mobile-only" // Классы для стилизации и условного отображения
                    aria-label={t('openMenuLabel')}      // Для доступности
                    onClick={onToggleSidebar}             // Обработчик из AppStateContext
                >
                    ☰
                </button>
            )}

            {/* Основной заголовок приложения (локализуемый) */}
            <h1 id="title">{t('title')}</h1>

            {/* Контейнер для десктопных элементов управления (скрыт на мобильных) */}
            <div className="header-controls desktop-only">
                <button 
                    id="shareButtonDesktop" 
                    className="header-btn" 
                    onClick={handleSaveState}
                >
                    {t('shareLink')}
                </button>
                <label htmlFor="gridSizeInputDesktopHeader">{t('gridSizeLabel')}</label>
                <input
                    type="number"
                    id="gridSizeInputDesktopHeader" // Уникальный ID для label
                    className="grid-size-input"
                    min={window.appConstants.MIN_GRID_SIZE}
                    max={window.appConstants.MAX_GRID_SIZE}
                    value={localDesktopGridSize}
                    onChange={handleDesktopGridSizeInputChange}
                    onBlur={applyDesktopGridSize} // Применяем при потере фокуса
                    onKeyDown={(e) => { if (e.key === 'Enter') applyDesktopGridSize(); }} // Применяем по Enter
                />
                <button onClick={applyDesktopGridSize}>{t('apply')}</button>
            </div>

            {/* Контейнер для кнопок управления видом (поворот, расстояние) (скрыт на мобильных) */}
            <div className="view-actions desktop-only">
                <button
                    id="rotateGridButtonDesktopHeader" // Уникальный ID
                    className={`control-btn ${isGridRotated ? 'active' : ''}`} // Динамический класс для активного состояния
                    onClick={toggleGridRotation}
                >
                    {/* Текст кнопки меняется в зависимости от состояния поворота */}
                    {isGridRotated ? t('resetRotation') : t('rotateGrid')}
                </button>
                <button
                    id="distanceToHGButtonDesktopHeader" // Уникальный ID
                    className={`control-btn ${showDistanceToHG ? 'active' : ''}`}
                    onClick={toggleDistanceToHG}
                >
                    {t('distanceToHGLabel')}
                </button>
            </div>

            {/* Контейнер для переключения языков (скрыт на мобильных) */}
            <div className="language-switcher desktop-only">
                {/* Динамически генерируем кнопки для каждого доступного языка */}
                {Object.keys(window.appTranslations.data.title).map((langCode) => ( // Итерация по ключам языков в title (или любом другом ключе)
                    <button
                        key={langCode}
                        className={`language-btn ${currentLang === langCode ? 'active' : ''}`}
                        onClick={() => switchLanguage(langCode)}
                        lang={langCode} // Добавляем атрибут lang для информации
                    >
                        {/* Отображаем код языка в верхнем регистре (например, "RU", "EN") */}
                        {langCode.split('_')[0].toUpperCase()} 
                    </button>
                ))}
            </div>
        </header>
    );
}

// Убедитесь, что ключ 'openMenuLabel' добавлен в translations.js для всех языков.
// Например: openMenuLabel: { ru: "Открыть меню", en: "Open menu", ... }