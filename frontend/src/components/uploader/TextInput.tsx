import { Col, Grid, TextInput } from "@tremor/react";
import { ReactElement } from "react";

type Props = {
  title: ReactElement | null;
  onValueChange: (value: string) => void;
  instruction?: ReactElement;
}

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
      <Col className="items-center" numColSpan={3}>
      <TextInput
        placeholder="Expected value"
        onChange={(e) => onValueChange(e.target.value)}
      />
      </Col>
      <Col className="items-center col-start-3 pt-2 pl-2" numColSpan={3}>
        {instruction}
      </Col>
    </Grid>
  )
}