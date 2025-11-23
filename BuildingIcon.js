// BuildingIcon.js
// Простой презентационный компонент для отображения кнопки с иконкой здания.
// Используется в основном в мобильной панели инструментов (слайдере) для выбора типа здания.
// Может быть также использован в других местах, где требуется отобразить только иконку здания как кнопку.

function BuildingIcon({ type, onClick, isActive, ariaLabel, title }) {
    // Получаем статическую конфигурацию для указанного типа здания
    const config = window.appBuildingConfig[type];

    // Если конфигурация для данного типа здания не найдена,
    // отображаем кнопку-заглушку с вопросительным знаком и выводим предупреждение в консоль.
    // Это помогает при отладке, если передан неверный тип.
    if (!config) {
        console.warn(`[BuildingIcon] Конфигурация для типа здания "${type}" не найдена.`);
        // Кнопка делается неактивной (disabled), так как она не представляет валидное действие.
        return (
            <button className="tool-slider-item error-icon" disabled title={`Unknown type: ${type}`}>
                ?
            </button>
        );
    }

    // Формируем строку CSS-классов для кнопки.
    // 'tool-slider-item' - общий класс для элементов в мобильном слайдере.
    // 'building-tool' - специфичный класс для кнопок-инструментов зданий.
    // 'active' - добавляется, если кнопка представляет текущий выбранный инструмент.
    let buttonClasses = "tool-slider-item building-tool";
    if (isActive) {
        buttonClasses += " active"; // Класс для визуальной индикации активного состояния
    }

    // Определяем текст для aria-label и title.
    // Приоритет у переданных props, затем используется локализованное имя типа здания (если есть),
    // в крайнем случае - сама иконка.
    // Локализованное имя типа здания должно получаться в родительском компоненте через t(type)
    // и передаваться сюда через props ariaLabel и title.
    const defaultLabel = config.icon; // Если ничего не передано, используем иконку
    const effectiveAriaLabel = ariaLabel || defaultLabel;
    const effectiveTitle = title || ariaLabel || defaultLabel;


    return (
        <button
            className={buttonClasses}
            data-type={type} // data-type может быть полезен для стилизации или для доступа в обработчиках событий
            onClick={onClick} // Обработчик клика/тапа, передается из родительского компонента
            aria-label={effectiveAriaLabel} // Важно для доступности, описывает назначение кнопки
            title={effectiveTitle}          // Всплывающая подсказка при наведении мыши
        >
            {/* Иконка здания отображается внутри span для возможной дополнительной стилизации */}
            <span className="icon">{config.icon}</span>
        </button>
    );
}