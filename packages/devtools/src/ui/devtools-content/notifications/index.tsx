import { withViewModel } from 'mobx-view-model-react';
import { NotificationsVM } from './model';
import css from './styles.module.css';


export const Notifications = withViewModel(NotificationsVM, ({ model }) => {
  if (!model.items.size) {
    return null;
  }
  return (
    <div className={css.notifications}>
      {[...model.items.values()].map((item) => (
        <div className={css.notification} key={item.id}>
          {item.title}
        </div>
      ))}
    </div>
  );
});
