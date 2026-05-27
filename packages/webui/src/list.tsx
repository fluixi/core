import { createComponent } from '@awc/element';
import { AdfList, AdfListBody, AdfListHeader, AdfListFooter, AdfListItem} from '@awc/adf-list';
import DOM from "@awc/dom"
// import '@awc/adf-list/adf-list.js';


const ListComponent = createComponent({
    tagName: "adf-list",
    elementClass: AdfList,
    compiler: DOM,
    displayName: "AdfList",
});
const ListHeader = createComponent({
    tagName: "adf-list-header",
    elementClass: AdfListHeader,
    compiler: DOM,
    displayName: "AdfListHeader",
});
const ListBody = createComponent({
    tagName: "adf-list-body",
    elementClass: AdfListBody,
    compiler: DOM,
    displayName: "AdfListBody",
});
const ListFooter = createComponent({
    tagName: "adf-list-footer",
    elementClass: AdfListFooter,
    compiler: DOM,
    displayName: "AdfListFooter",
});
const ListItem = createComponent({
    tagName: "adf-list-item",
    elementClass: AdfListItem,
    compiler: DOM,
    displayName: "AdfListItem",
});

export const List = Object.assign(ListComponent, {
    Header: ListHeader,
    Body: ListBody,
    Footer: ListFooter,
    Item: ListItem,
})

export default List