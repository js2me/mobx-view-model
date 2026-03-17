import { withViewModel } from 'mobx-view-model';
import { NotificationsVM } from './model';
import css from './styles.module.css';


export const Notifications = withViewModel(NotificationsVM, ({ model }) => {
  if (!model.items.size) {
    return null;
  }
  return (
    <div className={css.notifications}>
      {Array.from(model.items.values()).map((item) => (
        <div className={css.notification} key={item.id}>
          {item.title}
        </div>
      ))}
    </div>
  );
});
