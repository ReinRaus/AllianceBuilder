// RenameModal.js
// Компонент модального окна для переименования существующего здания (замка или мертвой зоны).
// Использует общий компонент <Modal /> для своей основы.

function RenameModal({ 
    isOpen,             // boolean: флаг, открыто ли модальное окно
    onClose,            // function: колбэк для закрытия модального окна
    onSubmit,           // function: колбэк, вызываемый при сабмите формы с новым именем
    currentName,        // string: текущее имя здания, для предзаполнения поля ввода
    buildingType        // string: тип здания ('castle' или 'deadzone'), используется для заголовка
}) {
    // Получаем функцию локализации 't' из LanguageContext
    const { t } = React.useContext(LanguageContext);
    
    // Локальное состояние для хранения нового имени, вводимого пользователем.
    // Инициализируется текущим именем здания.
    const [newName, setNewName] = React.useState('');

    // Эффект для обновления локального состояния `newName` и установки фокуса
    // при открытии модального окна или при изменении `currentName` (если модалка уже открыта).
    React.useEffect(() => {
        if (isOpen) {
            setNewName(currentName || ''); // Устанавливаем текущее имя или пустую строку
            
            // Устанавливаем фокус на поле ввода и выделяем его содержимое для удобства редактирования.
            // setTimeout(0) используется для гарантии, что DOM-элемент доступен.
            const inputElement = document.getElementById('renameInputInModal'); // Используем уникальный ID
            if (inputElement) {
                setTimeout(() => {
                    inputElement.focus();
                    inputElement.select(); // Выделяем весь текст в инпуте
                }, 0);
            }
        }
    }, [isOpen, currentName]); // Эффект зависит от isOpen и currentName

    // Обработчик сабмита формы
    const handleSubmit = (event) => {
        event.preventDefault(); // Предотвращаем стандартное поведение формы
        
        // Вызываем колбэк onSubmit, переданный из родительского компонента,
        // с новым именем (после trim).
        if (typeof onSubmit === 'function') {
            onSubmit(newName.trim());
        }
        // onClose(); // Закрытие модалки теперь происходит в App.js после вызова onSubmit из этой модалки
    };

    // Определяем текст заголовка модального окна в зависимости от типа здания
    let titleText = '';
    let isNameRequired = false; // По умолчанию имя не обязательно (например, для мертвой зоны можно оставить пустым)

    if (buildingType === window.appConstants.BUILDING_TYPES.DEADZONE) {
        titleText = t('renameDeadZoneModalTitle'); // "Название зоны" или "Переименовать зону"
    } else if (buildingType === window.appConstants.BUILDING_TYPES.CASTLE) {
        titleText = t('renameModalTitle'); // "Переименовать замок"
        isNameRequired = true; // Имя для замка обязательно
    } else {
        // Фолбек на случай неизвестного типа (маловероятно)
        titleText = t('renameGenericTitle') || "Rename Item"; // Нужен ключ renameGenericTitle
    }
    
    // Компонент Modal используется как обертка.
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            titleText={titleText}
            contentId="renameModalContent" // Для aria-labelledby
        >
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    id="renameInputInModal" // Уникальный ID для инпута
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    // Плейсхолдер здесь обычно не нужен, т.к. поле инициализируется текущим именем,
                    // но можно добавить общий, если currentName пустой.
                    placeholder={buildingType === window.appConstants.BUILDING_TYPES.CASTLE ? t('playerName') : t('deadZoneNamePlaceholder')}
                    required={isNameRequired} // Обязательность ввода для замка
                    maxLength={window.appConstants.MAX_PLAYER_NAME_LENGTH} // Ограничение длины
                    aria-label={titleText} // Aria-label может дублировать заголовок для поля ввода
                />
                <button type="submit">{t('save')}</button> {/* Кнопка сохранения, текст локализуется */}
            </form>
        </Modal>
    );
}

// Убедитесь, что следующие ключи добавлены в translations.js, если их нет:
// - renameGenericTitle (общий заголовок для переименования, если тип неизвестен)
// Остальные ключи (renameModalTitle, renameDeadZoneModalTitle, playerName, deadZoneNamePlaceholder, save)
// уже должны быть определены.