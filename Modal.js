// Modal.js
// Общий (generic) компонент-обертка для создания модальных окон.
// Обеспечивает базовую структуру, управление видимостью, закрытие
// по клику на фон или клавише Escape, и передачу заголовка.

function Modal({ 
    isOpen,             // boolean: флаг, открыта ли модалка
    onClose,            // function: колбэк, вызываемый при запросе на закрытие модалки
    titleKey,           // string (опционально): ключ для локализации заголовка из translations.js
    titleText,          // string (опционально): прямой текст заголовка (имеет приоритет над titleKey)
    children,           // React-элементы: содержимое модального окна
    modalId,            // string (опционально): ID для корневого элемента модалки (для тестов или специфичных нужд)
    contentId           // string (опционально): ID для элемента .modal-content (для aria-labelledby)
}) {
    // Получаем функцию локализации 't' и текущий язык из LanguageContext
    const { t } = React.useContext(LanguageContext);

    // Если модальное окно не должно быть открыто, ничего не рендерим
    if (!isOpen) {
        return null;
    }

    // Эффект для добавления/удаления слушателя нажатия клавиши Escape
    // для закрытия модального окна.
    React.useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                onClose(); // Вызываем колбэк закрытия
            }
        };

        // Добавляем слушатель при монтировании (или когда isOpen становится true)
        document.addEventListener('keydown', handleEscapeKey);

        // Функция очистки: удаляем слушатель при размонтировании компонента
        // или когда isOpen становится false (хотя компонент тогда не рендерится).
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose]); // Зависимости эффекта

    // Обработчик клика на оверлей (фон модального окна) для его закрытия.
    const handleOverlayClick = (event) => {
        // Закрываем, только если клик был непосредственно на самом оверлее (div.modal),
        // а не на его дочернем контенте (.modal-content).
        if (event.target === event.currentTarget) {
            onClose();
        }
    };
    
    // Определяем текст заголовка модального окна.
    // Приоритет у titleText, затем у локализованного titleKey, если он есть.
    const modalHeaderId = contentId ? `${contentId}-title` : (titleKey || 'modal-title-generic');
    const effectiveModalTitle = titleText || (titleKey ? t(titleKey) : '');

    // Используем ReactDOM.createPortal для рендеринга модального окна в конце document.body.
    // Это стандартная практика для модальных окон, чтобы избежать проблем с z-index
    // и стилями (например, overflow:hidden) родительских элементов.
    return ReactDOM.createPortal(
        <div 
            className="modal visible" // Класс .visible управляет анимацией появления (из styles.css)
            id={modalId}
            role="dialog"             // ARIA роль для диалоговых окон
            aria-modal="true"         // Указывает, что окно модальное (блокирует остальной интерфейс)
            aria-labelledby={modalHeaderId} // Связывает модалку с ее заголовком для доступности
            onClick={handleOverlayClick}  // Закрытие по клику на оверлей
        >
            <div 
                className="modal-content" 
                id={contentId}
                onClick={e => e.stopPropagation()} // Предотвращаем закрытие по клику на сам контент модалки
            >
                {/* Кнопка "крестик" для закрытия модального окна */}
                <button 
                    className="close" 
                    aria-label={t('closeModalLabel')} // Локализованный aria-label для доступности
                    onClick={onClose}                 // Вызов колбэка закрытия
                >×</button> {/* Символ "times" (крестик) */}
                
                {/* Заголовок модального окна (рендерится, если есть) */}
                {effectiveModalTitle && <h2 id={modalHeaderId}>{effectiveModalTitle}</h2>}
                
                {/* Основное содержимое модального окна, передается как children */}
                {children}
            </div>
        </div>,
        document.body // Целевой DOM-узел для портала (модалка будет вставлена в конец body)
    );
}

// Убедитесь, что ключ 'closeModalLabel' добавлен в translations.js для всех языков.
// Например: closeModalLabel: { ru: "Закрыть модальное окно", en: "Close modal window", ... }