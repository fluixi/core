import { createJsxComponent as createComponent, EventName } from '@awc/kettlejs';
import { AdfDialog, AdfDialogBody, AdfDialogContent, AdfDialogHeader, AdfDialogFooter, AdfDialogToggleEvent} from '@awc/adf-dialog';
import DOM from "@awc/dom"
// import '@awc/adf-dialog/adf-dialog.js';


const DialogComponent = createComponent({
    tagName: "adf-dialog",
    elementClass: AdfDialog,
    compiler: DOM,
    displayName: "AdfDialog",
    events: {
        onToggle: 'ontoggle' as EventName<AdfDialogToggleEvent>
    }
});
const DialogHeader = createComponent({
    tagName: "adf-dialog-header",
    elementClass: AdfDialogHeader,
    compiler: DOM,
    displayName: "AdfDialogHeader",
});
const DialogContent = createComponent({
    tagName: "adf-dialog-content",
    elementClass: AdfDialogContent,
    compiler: DOM,
    displayName: "AdfDialogContent",
});
const DialogBody = createComponent({
    tagName: "adf-dialog-body",
    elementClass: AdfDialogBody,
    compiler: DOM,
    displayName: "AdfDialogBody",
});
const DialogFooter = createComponent({
    tagName: "adf-dialog-footer",
    elementClass: AdfDialogFooter,
    compiler: DOM,
    displayName: "AdfDialogFooter",
});

export const Dialog = Object.assign(DialogComponent, {
    Header: DialogHeader,
    Body: DialogBody,
    Content: DialogContent,
    Footer: DialogFooter
})

export default Dialog