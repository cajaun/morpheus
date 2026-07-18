import { UsageVariantFlatList } from "./component-presentation/usage-variant-flatlist";
import { TRAY_EXAMPLE_VARIANTS } from "./data";

type ActionTrayExamplesProps = {
  initialVariantValue?: string;
};

const ActionTrayExamples = ({
  initialVariantValue,
}: ActionTrayExamplesProps) => (
  <UsageVariantFlatList
    data={TRAY_EXAMPLE_VARIANTS}
    initialVariantValue={initialVariantValue}
  />
);

export default ActionTrayExamples;
