import { useState } from "react";
import { Tray, useTrayNavigation } from "react-native-morpheus";
import { ExampleTrigger } from "../shared/example-trigger";
import {
  AddPaymentMethodStep,
  AddressDetailsStep,
  AddWalletAddressStep,
  PaymentButton,
  PaymentMethodHeader,
} from "../add-payment-method";

const WalletFooterButton = ({
  step,
  address,
}: {
  step: "address" | "details";
  address: string;
}) => {
  const { next, close } = useTrayNavigation();

  return step === "address" ? (
    <PaymentButton
      label="Next"
      onPress={next}
      disabled={address.trim().length === 0}
    />
  ) : (
    <PaymentButton label="Add Wallet" onPress={close} />
  );
};

const AddPaymentMethodKeyboardTray = () => {
  const [address, setAddress] = useState("");

  return (
    <Tray.Root
      stepOptions={{
        className: "bg-white",
      }}
    >
      <Tray.Trigger haptics="feedback">
        <ExampleTrigger label="Add Payment Method Keyboard" />
      </Tray.Trigger>

      <Tray.Step key="payment-methods">
        <PaymentMethodHeader title="Add Payment Method" />
        <AddPaymentMethodStep bankAccountEnabled={false} />
      </Tray.Step>

      <Tray.Step
        key="wallet-address"
        options={{
          keyboardAware: true,
        }}
      >
        <PaymentMethodHeader title="Add Wallet Address" showBack />
        <AddWalletAddressStep
          address={address}
          onChangeAddress={setAddress}
          showAction={false}
        />
        <Tray.Footer>
          <WalletFooterButton step="address" address={address} />
        </Tray.Footer>
      </Tray.Step>

      <Tray.Step
        key="address-details"
        options={{
          keyboardAware: true,
        }}
      >
        <PaymentMethodHeader title="Address Details" showBack />
        <AddressDetailsStep
          address={address}
          onChangeAddress={setAddress}
          showAction={false}
        />
        <Tray.Footer>
          <WalletFooterButton step="details" address={address} />
        </Tray.Footer>
      </Tray.Step>
    </Tray.Root>
  );
};

export default AddPaymentMethodKeyboardTray;
