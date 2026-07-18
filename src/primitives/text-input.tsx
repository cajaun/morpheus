import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { TextInput, TextInputProps } from "react-native";
import {
  useTrayHostActions,
  useTrayScope,
} from "../runtime/tray-context";

// wrap textinput so focus behavior participates in tray keyboard policy
export const TrayTextInput = forwardRef<TextInput, TextInputProps>(
  ({ autoFocus = false, ...props }, forwardedRef) => {
    const ref = useRef<TextInput>(null);
    const trayId = useTrayScope();
    const { anticipateKeyboard, registerFocusable } = useTrayHostActions();

    // forward the native input ref while keeping tray focus registration local
    useImperativeHandle(forwardedRef, () => ref.current as TextInput);

    useEffect(() => {
      if (!trayId) {
        return;
      }

      // registration lets tray level close logic blur the active field before dismissal
      return registerFocusable(trayId, ref);
    }, [registerFocusable, trayId]);

    useLayoutEffect(() => {
      if (!autoFocus) {
        return;
      }

      anticipateKeyboard();
      // autofocus is manual so keyboard anticipation can run before focus
      ref.current?.focus();
    }, [anticipateKeyboard, autoFocus]);

    const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
      (event) => {
        // manual focus should follow the same pre keyboard path as autofocus
        anticipateKeyboard();
        props.onFocus?.(event);
      },
      [anticipateKeyboard, props],
    );

    return (
      <TextInput
        ref={ref}
        // native autofocus would bypass tray keyboard anticipation
        autoFocus={false}
        {...props}
        onFocus={handleFocus}
      />
    );
  },
);

TrayTextInput.displayName = "TrayTextInput";
