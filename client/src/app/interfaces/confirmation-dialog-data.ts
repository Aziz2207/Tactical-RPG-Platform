export interface ConfirmationDialogData {
    title: string;
    message: string;
    onAgreed: () => void;
    onRefused?: () => void;
}
