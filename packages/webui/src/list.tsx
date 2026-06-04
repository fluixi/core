import { createComponent } from '@fluixi/element';
import { FlxList, FlxListBody, FlxListHeader, FlxListFooter, FlxListItem} from '@fluixi/flx-list';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-list/flx-list.js';


const ListComponent = createComponent({
    tagName: "flx-list",
    elementClass: FlxList,
    compiler: DOM,
    displayName: "FlxList",
});
const ListHeader = createComponent({
    tagName: "flx-list-header",
    elementClass: FlxListHeader,
    compiler: DOM,
    displayName: "FlxListHeader",
});
const ListBody = createComponent({
    tagName: "flx-list-body",
    elementClass: FlxListBody,
    compiler: DOM,
    displayName: "FlxListBody",
});
const ListFooter = createComponent({
    tagName: "flx-list-footer",
    elementClass: FlxListFooter,
    compiler: DOM,
    displayName: "FlxListFooter",
});
const ListItem = createComponent({
    tagName: "flx-list-item",
    elementClass: FlxListItem,
    compiler: DOM,
    displayName: "FlxListItem",
});

export const List = Object.assign(ListComponent, {
    Header: ListHeader,
    Body: ListBody,
    Footer: ListFooter,
    Item: ListItem,
})

export default List