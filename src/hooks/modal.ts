import { Message, Modal } from '@arco-design/web-vue';
import { useI18n } from 'vue-i18n';

interface ConfirmOptions {
  title?: string;
  content: string;
  successMsg?: string;
  onOk: () => void | Promise<void>;
  onSuccess?: () => void | Promise<void>;
}

interface ConfirmDeleteOptions extends Omit<ConfirmOptions, 'onOk' | 'content'> {
  content?: string;
  onDelete: () => void | Promise<void>;
}

export default function useModal() {
  const { t } = useI18n();

  const confirm = (options: ConfirmOptions) =>
    Modal.confirm({
      title: options.title ?? t('common.action.confirm'),
      content: options.content,
      onBeforeOk: async (done) => {
        try {
          await options.onOk();
          if (options.successMsg) Message.success(options.successMsg);
          await options.onSuccess?.();
          done(true);
        } catch {
          done(false);
        }
      },
    });

  const confirmDelete = (options: ConfirmDeleteOptions) =>
    confirm({
      ...options,
      title: options.title ?? t('common.confirm.delete.title'),
      content: options.content ?? t('common.confirm.delete.content'),
      onOk: options.onDelete,
    });

  return { confirm, confirmDelete };
}
