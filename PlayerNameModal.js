// PlayerNameModal.js
// Компонент модального окна для ввода имени при создании определенных типов зданий,
// таких как "Замок игрока" или "Мертвая зона".
// Использует общий компонент <Modal /> для своей основы.

function PlayerNameModal({ 
    isOpen,        // boolean: флаг, открыто ли модальное окно
    onClose,       // function: колбэк для закрытия модального окна
    onSubmit,      // function: колбэк, вызываемый при сабмите формы с введенным именем
    buildingType   // string: тип здания, для которого запрашивается имя ('castle' или 'deadzone')
                   //            используется для настройки заголовка и плейсхолдера
}) {
    // Получаем функцию локализации 't' из LanguageContext
    const { t } = React.useContext(LanguageContext);
    
    // Локальное состояние для хранения введенного имени
    const [name, setName] = React.useState('');

    // Эффект для сброса имени и установки фокуса на поле ввода при открытии модального окна
    React.useEffect(() => {
        if (isOpen) {
            setName(''); // Очищаем поле ввода при каждом открытии
            
            // Устанавливаем фокус на поле ввода.
            // setTimeout(0) используется, чтобы гарантировать, что DOM-элемент инпута
            // уже отрендерен и доступен для фокуса.
            const inputElement = document.getElementById('playerNameInputInModal'); // Используем уникальный ID
            if (inputElement) {
                setTimeout(() => inputElement.focus(), 0);
            }
        }
    }, [isOpen]); // Эффект зависит от состояния isOpen

    // Обработчик сабмита формы
    const handleSubmit = (event) => {
        event.preventDefault(); // Предотвращаем стандартное поведение формы (перезагрузку страницы)
        
        // Вызываем колбэк onSubmit, переданный из родительского компонента,
        // с обрезанным (trim) введенным именем.
        if (typeof onSubmit === 'function') {
            onSubmit(name.trim());
        }
        // onClose(); // Закрытие модалки теперь происходит в App.js после вызова onComplete или addBuilding
    };

    // Определяем текст заголовка и плейсхолдера в зависимости от типа здания
    let titleText = '';
    let placeholderText = '';
    // Имя обязательно для замка, для мертвой зоны - опционально
    let isNameRequired = false; 

    if (buildingType === window.appConstants.BUILDING_TYPES.DEADZONE) {
        titleText = t('renameDeadZoneModalTitle'); // Используем тот же ключ, что и для переименования
        placeholderText = t('deadZoneNamePlaceholder');
        isNameRequired = false; // Имя для мертвой зоны может быть пустым
    } else if (buildingType === window.appConstants.BUILDING_TYPES.CASTLE) {
        titleText = t('modalTitle'); // Стандартный заголовок для "Имя игрока"
        placeholderText = t('playerName');
        isNameRequired = true; // Имя для замка обязательно
    } else {
        // Фолбек на случай неизвестного типа, хотя этого не должно происходить
        titleText = t('enterNameLabel') || "Enter Name"; // Нужен ключ enterNameLabel
        placeholderText = t('namePlaceholder') || "Name"; // Нужен ключ namePlaceholder
    }
    
    // Компонент Modal используется как обертка.
    // Передаем ему управление видимостью (isOpen), колбэк закрытия (onClose),
    // и текст заголовка. Содержимое модалки (форма) передается как children.
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            titleText={titleText}
            contentId="playerNameModalContent" // Для aria-labelledby
        >
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    id="playerNameInputInModal" // Уникальный ID для инпута
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={placeholderText}
                    required={isNameRequired} // Атрибут required для валидации HTML5
                    maxLength={window.appConstants.MAX_PLAYER_NAME_LENGTH} // Ограничение длины имени
                    aria-label={placeholderText} // Для доступности
                />
                <button type="submit">{t('save')}</button> {/* Кнопка сохранения, текст локализуется */}
            </form>
        </Modal>
    );
}

// Необходимые ключи для локализации, если еще не добавлены в translations.js:
// - enterNameLabel (общий заголовок для ввода имени)
// - namePlaceholder (общий плейсхолдер для имени)
// Ключи modalTitle, playerName, renameDeadZoneModalTitle, deadZoneNamePlaceholder, save уже должны быть.