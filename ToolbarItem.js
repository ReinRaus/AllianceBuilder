// ToolbarItem.js
// Компонент для отображения одного элемента (обычно здания для перетаскивания)
// в десктопной панели инструментов (сайдбаре слева).
// Отображает иконку и локализованное название типа здания.
// Сам элемент делается перетаскиваемым с помощью interact.js в родительском компоненте DesktopToolbar.js.

function ToolbarItem({ type }) { // Принимает 'type' здания как основной prop
    // Получаем функцию локализации 't' из LanguageContext
    const { t } = React.useContext(LanguageContext);
    
    // Получаем статическую конфигурацию для данного типа здания
    // window.appBuildingConfig должен быть доступен глобально
    const config = window.appBuildingConfig[type];

    // Если конфигурация для данного типа не найдена (например, из-за ошибки в данных),
    // отображаем элемент-заглушку с сообщением об ошибке.
    if (!config) {
        console.warn(`[ToolbarItem] Конфигурация для типа здания "${type}" не найдена.`);
        return (
            <div 
                className="toolbar-item error-item" // Дополнительный класс для стилизации ошибки
                title={`Unknown building type: ${type}`}
            >
                <span className="icon">❓</span>
                <span className="name">Error: Type "{type}"</span>
            </div>
        );
    }

    // Получаем локализованное имя для данного типа здания
    const localizedName = t(type); 

    // data-type атрибут здесь критически важен:
    // 1. DesktopToolbar.js использует его для инициализации interact.js draggable на этих элементах.
    // 2. Grid.js (как dropzone) использует его для определения типа перетаскиваемого элемента
    //    через event.relatedTarget.dataset.type.
    // title атрибут предоставляет всплывающую подсказку с полным локализованным названием.
    // Атрибут draggable="true" не нужен, так как перетаскивание полностью управляется interact.js.
    return (
        <div
            className="toolbar-item" // Основной класс для стилизации элемента в тулбаре
            data-type={type}         // Тип здания, используется для логики D&D
            title={localizedName}    // Всплывающая подсказка
            // aria-label={localizedName} // Можно добавить, если элемент интерактивен сам по себе (здесь D&D)
        >
            {/* Иконка здания */}
            <span className="icon">{config.icon}</span>
            {/* Локализованное название здания */}
            <span className="name">{localizedName}</span>
        </div>
    );
}