import { Col, Grid, NumberInput, Text } from "@tremor/react";

type Props = {
  defaultValue?: number;
  onValueChange: (value: string) => void;
};

export function ExpectedChangeInput({ defaultValue, onValueChange }: Props) {
  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        <Text className="pr-4 text-black">{"Expected change %"}</Text>
      </Col>
      <Col className="items-center flex gap-1" numColSpan={3}>
        <NumberInput
          className="w-[100px]"
          placeholder="Expected change"
          defaultValue={defaultValue ? defaultValue * 100 : 0}
          onChange={(e) => onValueChange(e.target.value)}
          enableStepper={false}
        />
        %
      </Col>
      <Col className="items-center col-start-3 pt-2 pl-2" numColSpan={3}>
        <Text>
          The expected percentage of the change. This is used by DSensei to
          calculate outlier segments. For instance if you are analyzing a recent
          drop for a metric that used to have 5% growth, put 5%.
        </Text>
      </Col>
    </Grid>
  );
}
