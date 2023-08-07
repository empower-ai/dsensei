import { BigquerySchema } from "../../../types/data-source";
import ReportConfig from "./ReportConfig";

interface Props {
  schema: BigquerySchema;
}

export default function BigqueryBasedReportConfig({
  schema: { fields },
}: Props) {
  const rowCountByColumn = Object.fromEntries(
    fields.map((field) => [field.name, field.numDistinctValues])
  );
  return (
    <ReportConfig
      columns={fields}
      rowCountByColumn={rowCountByColumn}
      onSubmit={async (
        selectedColumns,
        baseDateRange,
        comparisonDateRange
      ) => {}}
      isUploading={false}
    />
  );
}
