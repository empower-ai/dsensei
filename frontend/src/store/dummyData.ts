export const metrics = fetch("http://localhost:3000/metrics/metrics");

// export const dummyRevenueMetric = {
//   name: "revenue",
//   baselineValue: 1000,
//   baselineValueByDate: [
//     { date: new Date("2023-04-01"), value: 200 },
//     { date: new Date("2023-04-02"), value: 205 },
//     { date: new Date("2023-04-03"), value: 195 },
//     { date: new Date("2023-04-04"), value: 193 },
//     { date: new Date("2023-04-05"), value: 207 },
//   ],
//   baselineNumRows: 5,
//   comparisonValue: 1050,
//   comparisonValueByDate: [
//     { date: new Date("2023-05-01"), value: 192 },
//     { date: new Date("2023-05-02"), value: 218 },
//     { date: new Date("2023-05-03"), value: 210 },
//     { date: new Date("2023-05-04"), value: 224 },
//     { date: new Date("2023-05-05"), value: 206 },
//   ],
//   comparisonNumRows: 5,
//   baselineDateRange: {
//     startDate: new Date("2023-04-01"),
//     endDate: new Date("2023-04-05"),
//   },
//   comparisonDateRange: {
//     startDate: new Date("2023-05-01"),
//     endDate: new Date("2023-05-05"),
//   },
//   dimensions: Object.fromEntries([
//     ["country", ["USA", "China", "Cuba"]],
//     ["device", ["ios", "android"]],
//     ["brand", ["nike", "adidas"]],
//   ]),
//   topDriverSliceKeys: [
//     [
//       {
//         dimension: "country",
//         value: "USA",
//       },
//     ],
//     [
//       {
//         dimension: "country",
//         value: "China",
//       },
//     ],
//   ],
//   dimensionSliceInfo: Object.fromEntries([
//     [
//       "country:USA",
//       {
//         key: [
//           {
//             dimension: "country",
//             value: "USA",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [
//           [
//             {
//               dimension: "country",
//               value: "USA",
//             },
//             {
//               dimension: "device",
//               value: "ios",
//             },
//           ],
//           [
//             {
//               dimension: "country",
//               value: "USA",
//             },
//             {
//               dimension: "brand",
//               value: "nike",
//             },
//           ],
//         ],
//         baselineValue: {
//           sliceSize: 33.2,
//           sliceCount: 3042,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 20.2,
//           sliceCount: 2942,
//           sliceValue: 123,
//         },
//         impact: 1000,
//       },
//     ],
//     [
//       "country:China",
//       {
//         key: [
//           {
//             dimension: "country",
//             value: "China",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [],
//         baselineValue: {
//           sliceSize: 33.2,
//           sliceCount: 3042,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 20.2,
//           sliceCount: 2942,
//           sliceValue: 123,
//         },
//         impact: 32,
//       },
//     ],
//     [
//       "country:USA|device:ios",
//       {
//         key: [
//           {
//             dimension: "country",
//             value: "USA",
//           },
//           {
//             dimension: "device",
//             value: "ios",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [],
//         baselineValue: {
//           sliceSize: 11.2,
//           sliceCount: 2042,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 14.2,
//           sliceCount: 2142,
//           sliceValue: 153,
//         },
//         impact: 400,
//       },
//     ],
//     [
//       "brand:nike|country:USA",
//       {
//         key: [
//           {
//             dimension: "country",
//             value: "USA",
//           },
//           {
//             dimension: "brand",
//             value: "nike",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [],
//         baselineValue: {
//           sliceSize: 24.2,
//           sliceCount: 2242,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 20.2,
//           sliceCount: 2122,
//           sliceValue: 123,
//         },
//         impact: -300,
//       },
//     ],
//   ]),
// };

// export const dummyOrdersMetric = {
//   name: "orders",
//   baselineValue: 235,
//   baselineValueByDate: [
//     { date: new Date("2023-04-01"), value: 200 },
//     { date: new Date("2023-04-02"), value: 205 },
//     { date: new Date("2023-04-03"), value: 195 },
//     { date: new Date("2023-04-04"), value: 193 },
//     { date: new Date("2023-04-05"), value: 207 },
//   ],
//   baselineNumRows: 5,
//   comparisonValue: 189,
//   comparisonValueByDate: [
//     { date: new Date("2023-05-01"), value: 192 },
//     { date: new Date("2023-05-02"), value: 218 },
//     { date: new Date("2023-05-03"), value: 210 },
//     { date: new Date("2023-05-04"), value: 224 },
//     { date: new Date("2023-05-05"), value: 206 },
//   ],
//   comparisonNumRows: 5,
//   baselineDateRange: {
//     startDate: new Date("2023-04-01"),
//     endDate: new Date("2023-04-05"),
//   },
//   comparisonDateRange: {
//     startDate: new Date("2023-05-01"),
//     endDate: new Date("2023-05-05"),
//   },
//   dimensions: Object.fromEntries([
//     ["country", ["USA", "China", "Cuba"]],
//     ["device", ["ios", "android"]],
//     ["brand", ["nike", "adidas"]],
//   ]),
//   topDriverSliceKeys: [
//     [
//       {
//         dimension: "country",
//         value: "USA",
//       },
//     ],
//     [
//       {
//         dimension: "country",
//         value: "China",
//       },
//     ],
//   ],
//   dimensionSliceInfo: Object.fromEntries([
//     [
//       "country:USA",
//       {
//         key: [
//           {
//             dimension: "country",
//             value: "USA",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [
//           [
//             {
//               dimension: "device",
//               value: "ios",
//             },
//           ],
//           [
//             {
//               dimension: "brand",
//               value: "nike",
//             },
//           ],
//         ],
//         baselineValue: {
//           sliceSize: 33.2,
//           sliceCount: 3042,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 20.2,
//           sliceCount: 2942,
//           sliceValue: 123,
//         },
//         impact: 1000,
//       },
//     ],
//     [
//       "device:ios",
//       {
//         key: [
//           {
//             dimension: "device",
//             value: "ios",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [],
//         baselineValue: {
//           sliceSize: 11.2,
//           sliceCount: 2042,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 14.2,
//           sliceCount: 2142,
//           sliceValue: 123,
//         },
//         impact: 400,
//       },
//     ],
//     [
//       "brand:nike",
//       {
//         key: [
//           {
//             dimension: "brand",
//             value: "nike",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [],
//         baselineValue: {
//           sliceSize: 24.2,
//           sliceCount: 2242,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 20.2,
//           sliceCount: 2122,
//           sliceValue: 123,
//         },
//         impact: -300,
//       },
//     ],
//   ]),
// };

// export const dummyBuyersMetric = {
//   name: "buyers",
//   baselineValue: 96,
//   baselineValueByDate: [
//     { date: new Date("2023-04-01"), value: 200 },
//     { date: new Date("2023-04-02"), value: 205 },
//     { date: new Date("2023-04-03"), value: 195 },
//     { date: new Date("2023-04-04"), value: 193 },
//     { date: new Date("2023-04-05"), value: 207 },
//   ],
//   baselineNumRows: 5,
//   comparisonValue: 108,
//   comparisonValueByDate: [
//     { date: new Date("2023-05-01"), value: 192 },
//     { date: new Date("2023-05-02"), value: 218 },
//     { date: new Date("2023-05-03"), value: 210 },
//     { date: new Date("2023-05-04"), value: 224 },
//     { date: new Date("2023-05-05"), value: 206 },
//   ],
//   comparisonNumRows: 5,
//   baselineDateRange: {
//     startDate: new Date("2023-04-01"),
//     endDate: new Date("2023-04-05"),
//   },
//   comparisonDateRange: {
//     startDate: new Date("2023-05-01"),
//     endDate: new Date("2023-05-05"),
//   },
//   dimensions: Object.fromEntries([
//     ["country", ["USA", "China", "Cuba"]],
//     ["device", ["ios", "android"]],
//     ["brand", ["nike", "adidas"]],
//   ]),
//   topDriverSliceKeys: [
//     [
//       {
//         dimension: "country",
//         value: "USA",
//       },
//     ],
//     [
//       {
//         dimension: "country",
//         value: "China",
//       },
//     ],
//   ],
//   dimensionSliceInfo: Object.fromEntries([
//     [
//       "country:USA",
//       {
//         key: [
//           {
//             dimension: "country",
//             value: "USA",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [
//           [
//             {
//               dimension: "device",
//               value: "ios",
//             },
//           ],
//           [
//             {
//               dimension: "brand",
//               value: "nike",
//             },
//           ],
//         ],
//         baselineValue: {
//           sliceSize: 33.2,
//           sliceCount: 3042,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 20.2,
//           sliceCount: 2942,
//           sliceValue: 123,
//         },
//         impact: 1000,
//       },
//     ],
//     [
//       "device:ios",
//       {
//         key: [
//           {
//             dimension: "device",
//             value: "ios",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [],
//         baselineValue: {
//           sliceSize: 11.2,
//           sliceCount: 2042,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 14.2,
//           sliceCount: 2142,
//           sliceValue: 123,
//         },
//         impact: 400,
//       },
//     ],
//     [
//       "brand:nike",
//       {
//         key: [
//           {
//             dimension: "brand",
//             value: "nike",
//           },
//         ],
//         topDrivingDimensionSliceKeys: [],
//         baselineValue: {
//           sliceSize: 24.2,
//           sliceCount: 2242,
//           sliceValue: 123,
//         },
//         comparisonValue: {
//           sliceSize: 20.2,
//           sliceCount: 2122,
//           sliceValue: 123,
//         },
//         impact: -300,
//       },
//     ],
//   ]),
// };
