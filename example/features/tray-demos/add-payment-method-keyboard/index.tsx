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

// One footer shared by both keyboard steps (same id): it stays on screen,
// riding the keyboard, while the steps change; only its label and action
// follow the step. It enters with Add Wallet Address and leaves when going
// back to the method list.
const WALLET_FOOTER_ID = "wallet-action";

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
          showAction={false}
        />
        <Tray.Footer id={WALLET_FOOTER_ID}>
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
        <Tray.Footer id={WALLET_FOOTER_ID}>
          <WalletFooterButton step="details" address={address} />
        </Tray.Footer>
      </Tray.Step>
    </Tray.Root>
  );
};

export default AddPaymentMethodKeyboardTray;
