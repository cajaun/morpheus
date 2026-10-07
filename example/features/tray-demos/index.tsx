import { UsageVariantFlatList } from "./component-presentation/usage-variant-flatlist";
import { TRAY_EXAMPLE_VARIANTS } from "./data";

type TrayExamplesProps = {
  initialVariantValue?: string;
};

const TrayExamples = ({
  initialVariantValue,
}: TrayExamplesProps) => (
  <UsageVariantFlatList
    data={TRAY_EXAMPLE_VARIANTS}
    initialVariantValue={initialVariantValue}
  />
);

export default TrayExamples;
