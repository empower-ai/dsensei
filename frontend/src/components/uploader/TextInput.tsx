import { Col, Grid, NumberInput } from "@tremor/react";
import { ReactElement } from "react";

type Props = {
  title: ReactElement | null;
  onValueChange: (value: string) => void;
  instruction?: ReactElement;
};

export function SingleLineTextInput({
  title,
  onValueChange,
  instruction,
}: Props) {
  return (
    <Grid numItems={5}>
      <Col className="flex items-center justify-end" numColSpan={2}>
        {title}
      </Col>
      <Col className="items-center flex gap-1" numColSpan={3}>
        <NumberInput
          className="w-[100px]"
          placeholder="Expected change"
          defaultValue={0}
          onChange={(e) => onValueChange(e.target.value)}
          enableStepper={false}
        />
        %
      </Col>
      <Col className="items-center col-start-3 pt-2 pl-2" numColSpan={3}>
        {instruction}
      </Col>
    </Grid>
  );
}
