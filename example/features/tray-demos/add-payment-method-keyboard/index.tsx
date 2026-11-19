import { useState } from "react";
import { Tray } from "react-native-morpheus";
import { ExampleTrigger } from "../shared/example-trigger";
import {
  AddPaymentMethodStep,
  AddressDetailsStep,
  AddWalletAddressStep,
  PaymentMethodHeader,
} from "../add-payment-method";

// Add Payment Method, cut down to the keyboard path: Stablecoin Wallet goes
// straight to Add Wallet Address, then Address Details. Both steps focus a
// text field, so this exercises entering, handing over and leaving the
// keyboard between sheet steps.
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
        />
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
        />
      </Tray.Step>
    </Tray.Root>
  );
};

export default AddPaymentMethodKeyboardTray;
