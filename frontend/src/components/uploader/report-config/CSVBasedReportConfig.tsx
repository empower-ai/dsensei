import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createNewDateWithBrowserTimeZone } from "../../../common/utils";
import { CSVSchema, DateField } from "../../../types/data-source";
import {
  DateRangeRelatedData,
  MetricColumn,
  PrefillConfig,
  RowCountByDateAndColumn,
  TargetDirection,
} from "../../../types/report-config";
import ReportConfig from "./ReportConfig";

const commercePrefills: PrefillConfig = {
  metricColumn: {
    aggregationOption: "nunique",
    singularMetric: {
      columnName: "userId",
      aggregationMethod: "nunique",
    },
  },
  dateColumn: "eventTime",
  groupByColumns: [
    "country",
    "gender",
    "majorOsVersion",
    "phoneBrand",
    "age",
    "language",
    "platform",
  ],
  baseDateRange: {
    from: createNewDateWithBrowserTimeZone("2022-07-01"),
    to: createNewDateWithBrowserTimeZone("2022-07-31"),
  },
  comparisonDateRange: {
    from: createNewDateWithBrowserTimeZone("2022-08-01"),
    to: createNewDateWithBrowserTimeZone("2022-08-31"),
  },
};

const doorDashPrefills: PrefillConfig = {
  metricColumn: {
    aggregationOption: "ratio",
    ratioMetric: {
      metricName: "cancelation_rate",
      numerator: {
        aggregationMethod: "nunique",
        columnName: "order_id",
        filter: {
          column: "order_status",
          value: "canceled",
        },
      },
      denominator: {
        aggregationMethod: "nunique",
        columnName: "order_id",
      },
    },
  },
  dateColumn: "order_date",
  groupByColumns: [
    "order_canceled_by",
    "age_group",
    "has_dash_pass",
    "city",
    "state",
    "gender",
    "merchant",
    "store",
    "vertical",
    "tip_percentage",
    "channel",
    "hour_of_the_day",
    "promo_code",
    "payment_method",
  ],
  baseDateRange: {
    from: createNewDateWithBrowserTimeZone("2023-08-14"),
    to: createNewDateWithBrowserTimeZone("2023-08-20"),
  },
  comparisonDateRange: {
    from: createNewDateWithBrowserTimeZone("2023-08-21"),
    to: createNewDateWithBrowserTimeZone("2023-08-27"),
  },
};

const insurancePrefills: PrefillConfig = {
  metricColumn: {
    aggregationOption: "sum",
    singularMetric: {
      columnName: "total_claim_amount",
    },
  },
  groupByColumns: [
    "age_group",
    "insured_gender",
    "insured_education_level",
    "insured_occupation",
    "insured_hobbies",
    "insured_relationship",
    "auto_make",
    "auto_year",
    "incident_type",
    "incident_severity",
    "incident_state",
    "incident_city",
    "property_damage",
    "police_report_available",
    "authorities_contacted",
  ],
  dateColumn: "incident_date",
  baseDateRange: {
    from: createNewDateWithBrowserTimeZone("2023-07-04"),
    to: createNewDateWithBrowserTimeZone("2023-07-31"),
  },
  comparisonDateRange: {
    from: createNewDateWithBrowserTimeZone("2023-08-01"),
    to: createNewDateWithBrowserTimeZone("2023-08-28"),
  },
};

interface Props {
  schema: CSVSchema;
  prefillWithSampleData: boolean;
}

export default function CSVBasedReportConfig({
  schema,
  prefillWithSampleData,
}: Props) {
  const navigate = useNavigate();
  const { fields } = schema;

  const [rowCountByDateAndColumn, setRowCountByDateAndColumn] =
    useState<RowCountByDateAndColumn>({});
  const [rowCountByColumn, setRowCountByColumn] = useState<{
    [key: string]: number;
  }>({});
  const [prefillConfig, setPrefillConfig] = useState<PrefillConfig | undefined>(
    undefined
  );

  const prefill = (sample: "doordash" | "insurance") => {
    if (sample === "doordash") {
      setPrefillConfig(doorDashPrefills);
    } else if (sample === "insurance") {
      setPrefillConfig(insurancePrefills);
    }
  };

  useEffect(() => {
    if (prefillWithSampleData) {
      setPrefillConfig(commercePrefills);
    }
  }, [prefillWithSampleData]);

  useEffect(() => {
    async function calculateCountByDateAndColumn() {
      setRowCountByDateAndColumn(
        Object.fromEntries(
          Object.values(fields)
            .filter((field) => field.type === "DATE")
            .map((field) => [field.name, (field as DateField).numRowsByDate])
        )
      );
    }

    async function calculateDistinctCountByColumn() {
      setRowCountByColumn(
        Object.fromEntries(
          Object.values(fields).map((field) => [
            field.name,
            field.numDistinctValues,
          ])
        )
      );
    }

    calculateDistinctCountByColumn();
    calculateCountByDateAndColumn();
  }, [fields]);

  const onSubmit = async (
    dateColumn: string,
    dateColumnType: string,
    metricColumn: MetricColumn,
    groupByColumns: string[],
    dateRangeData: DateRangeRelatedData,
    targetDirection: TargetDirection,
    expectedValue: number,
    maxNumDimensions: number
  ) => {
    navigate("/dashboard", {
      state: {
        fileId: schema.name,
        schema,
        rowCountByColumn,
        dataSourceType: "csv",
        dateColumn,
        dateColumnType,
        groupByColumns,
        metricColumn,
        dateRangeData,
        targetDirection,
        expectedValue,
        filters: [],
        maxNumDimensions,
      },
    });
  };

  return (
    <ReportConfig
      schema={schema}
      dataSourceType="csv"
      rowCountByColumn={rowCountByColumn}
      rowCountByDateColumn={rowCountByDateAndColumn}
      prefilledConfigs={prefillConfig}
      prefill={prefill}
      onSubmit={onSubmit}
    />
  );
}
