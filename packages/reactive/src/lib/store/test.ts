// import { applyDiff, diffObjectDetailed, reconcile } from "@fluixi/utils/object";
// import { createStore, unwrap } from "./store.js";

// const [get, set] = createStore([
// //   {
// //     key: 'S|Red',
// //     title: 'S / Red',
// //     options: {
// //       Size: 'S',
// //       Color: 'Red',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 10,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 9,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 10000,
// //       },
// //     ],
// //     sku: 'SKU-S|Red-9c93eb8bda-40e8',
// //     stock: 200,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: true,
// //     variantId: 'variant_01KR86YBXV54J41EXE3XM3RB6H',
// //     inventory_items: [
// //       {
// //         variant_id: 'variant_01KR86YBXV54J41EXE3XM3RB6H',
// //         inventory_item_id: 'iitem_01KR86YBZ4275ZMFME344V9XHA',
// //         id: 'pvitem_01KR86YBZJ17APZ1K3FZQ9TG6P',
// //         required_quantity: 1,
// //         created_at: '2026-05-10T05:49:42.770Z',
// //         updated_at: '2026-05-10T05:49:42.770Z',
// //         deleted_at: null,
// //       },
// //     ],
// //     _id: 'variant_01KR86YBXV54J41EXE3XM3RB6H',
// //   },
// //   {
// //     key: 'M|Blue',
// //     title: 'M / Blue',
// //     options: {
// //       Size: 'M',
// //       Color: 'Blue',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 10,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 9,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 10000,
// //       },
// //     ],
// //     sku: 'SKU-M|Blue-df9bd0698a-4f18',
// //     stock: 200,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: true,
// //     variantId: 'variant_01KR86YBXW22S1S0MN5F1AS4CC',
// //     inventory_items: [
// //       {
// //         variant_id: 'variant_01KR86YBXW22S1S0MN5F1AS4CC',
// //         inventory_item_id: 'iitem_01KR86YBZ5G5WW0YVREGM80FNX',
// //         id: 'pvitem_01KR86YBZKN526HPES37AWKMZF',
// //         required_quantity: 1,
// //         created_at: '2026-05-10T05:49:42.770Z',
// //         updated_at: '2026-05-10T05:49:42.770Z',
// //         deleted_at: null,
// //       },
// //     ],
// //     _id: 'variant_01KR86YBXW22S1S0MN5F1AS4CC',
// //   },
// //   {
// //     key: 'S|Blue',
// //     title: 'S / Blue',
// //     options: {
// //       Size: 'S',
// //       Color: 'Blue',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 10,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 9,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 10000,
// //       },
// //     ],
// //     sku: 'SKU-S|Blue-1283986a78-4a58',
// //     stock: 5,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: true,
// //     variantId: 'variant_01KR86YBXWCST54AWJE2H9MZMX',
// //     inventory_items: [
// //       {
// //         variant_id: 'variant_01KR86YBXWCST54AWJE2H9MZMX',
// //         inventory_item_id: 'iitem_01KR86YBZ5SJ82930HCZB276E6',
// //         id: 'pvitem_01KR8J5MHPQ2G2FX4ES9PEEJTW',
// //         required_quantity: 10,
// //         created_at: '2026-05-10T05:49:42.770Z',
// //         updated_at: '2026-05-10T09:02:58.550Z',
// //         deleted_at: null,
// //       },
// //     ],
// //     _id: 'variant_01KR86YBXWCST54AWJE2H9MZMX',
// //   },
//   {
//     key: 'M|Red',
//     title: 'M / Red',
//     options: {
//       Size: 'M',
//       Color: 'Red',
//     },
//     prices: [
//       {
//         currency_code: 'usd',
//         amount: 10,
//       },
//       {
//         currency_code: 'eur',
//         amount: 9,
//       },
//       {
//         currency_code: 'xof',
//         amount: 10000,
//       },
//     ],
//     sku: 'SKU-M|Red-23adbd9288-4ae8',
//     stock: 200,
//     manageInventory: true,
//     allowBackorder: false,
//     inventoryKit: true,
//     variantId: 'variant_01KR86YBXWSJ5JFSBB3H57FQQR',
//     inventory_items: [
//       {
//         variant_id: 'variant_01KR86YBXWSJ5JFSBB3H57FQQR',
//         inventory_item_id: 'iitem_01KR86YBZ5NW9M4B1X6B29TJRY',
//         id: 'pvitem_01KR86YBZKQD9MDFCK779YMN1F',
//         required_quantity: 1,
//         created_at: '2026-05-10T05:49:42.770Z',
//         updated_at: '2026-05-10T05:49:42.770Z',
//         deleted_at: null,
//       },
//     ],
//     _id: 'variant_01KR86YBXWSJ5JFSBB3H57FQQR',
//   },
// ]);

// const val = [
// //   {
// //     key: 'S|Red|Nike',
// //     title: 'S / Red / Nike',
// //     options: {
// //       Size: 'S',
// //       Color: 'Red',
// //       Marque: 'Nike',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 0,
// //       },
// //     ],
// //     sku: 'SKU-S|Red|Nike-a2b7f5764b-4038',
// //     stock: 0,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: false,
// //   },
// //   {
// //     key: 'S|Red|Addidas',
// //     title: 'S / Red / Addidas',
// //     options: {
// //       Size: 'S',
// //       Color: 'Red',
// //       Marque: 'Addidas',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 0,
// //       },
// //     ],
// //     sku: 'SKU-S|Red|Addidas-3a807a0779-4728',
// //     stock: 0,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: false,
// //   },
// //   {
// //     key: 'S|Blue|Nike',
// //     title: 'S / Blue / Nike',
// //     options: {
// //       Size: 'S',
// //       Color: 'Blue',
// //       Marque: 'Nike',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 0,
// //       },
// //     ],
// //     sku: 'SKU-S|Blue|Nike-4a88d068d9-4fa8',
// //     stock: 0,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: false,
// //   },
// //   {
// //     key: 'S|Blue|Addidas',
// //     title: 'S / Blue / Addidas',
// //     options: {
// //       Size: 'S',
// //       Color: 'Blue',
// //       Marque: 'Addidas',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 0,
// //       },
// //     ],
// //     sku: 'SKU-S|Blue|Addidas-52871fa189-4ad8',
// //     stock: 0,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: false,
// //   },
// //   {
// //     key: 'M|Red|Nike',
// //     title: 'M / Red / Nike',
// //     options: {
// //       Size: 'M',
// //       Color: 'Red',
// //       Marque: 'Nike',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 0,
// //       },
// //     ],
// //     sku: 'SKU-M|Red|Nike-10801faf49-4a58',
// //     stock: 0,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: false,
// //   },
//   {
//     key: 'M|Red|Addidas',
//     title: 'M / Red / Addidas',
//     options: {
//       Size: 'M',
//       Color: 'Red',
//       Marque: 'Addidas',
//     },
//     prices: [
//       {
//         currency_code: 'usd',
//         amount: 0,
//       },
//       {
//         currency_code: 'eur',
//         amount: 0,
//       },
//       {
//         currency_code: 'xof',
//         amount: 0,
//       },
//     ],
//     sku: 'SKU-M|Red|Addidas-5fac7c6e09-4ad8',
//     stock: 0,
//     manageInventory: true,
//     allowBackorder: false,
//     inventoryKit: false,
//   },
// //   {
// //     key: 'M|Blue|Nike',
// //     title: 'M / Blue / Nike',
// //     options: {
// //       Size: 'M',
// //       Color: 'Blue',
// //       Marque: 'Nike',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 0,
// //       },
// //     ],
// //     sku: 'SKU-M|Blue|Nike-44843dffc8-4058',
// //     stock: 0,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: false,
// //   },
// //   {
// //     key: 'M|Blue|Addidas',
// //     title: 'M / Blue / Addidas',
// //     options: {
// //       Size: 'M',
// //       Color: 'Blue',
// //       Marque: 'Addidas',
// //     },
// //     prices: [
// //       {
// //         currency_code: 'usd',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'eur',
// //         amount: 0,
// //       },
// //       {
// //         currency_code: 'xof',
// //         amount: 0,
// //       },
// //     ],
// //     sku: 'SKU-M|Blue|Addidas-dcbae1d6ab-43e8',
// //     stock: 0,
// //     manageInventory: true,
// //     allowBackorder: false,
// //     inventoryKit: false,
// //   },
// ];


// set((prev)=>{
//     return [
//         ...val,
//         ...prev, 
//     ]
// })

// // const diff = diffObjectDetailed(get, val);
// // console.log('diff is', diff);
// // const newV = applyDiff(get, diff);

// // reconcile([...val, ...unwrap(get)])(val)[2];
// console.log('final', get);
// // console.log('final', newV);