import { observer } from 'mobx-react-lite';
import type { DevtoolsNotifications } from '@/model/notifications';
import css from './styles.module.css';

export const Notifications = observer(
  ({ model }: { model: DevtoolsNotifications }) =>
    model.items.size > 0 ? (
      <div className={css.notifications} role="status">
        {[...model.items.values()].map((item) => (
          <div className={css.notification} key={item.id}>
            {item.title}
          </div>
        ))}
      </div>
    ) : null,
);
