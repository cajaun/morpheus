import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type FC, memo } from 'react';

import { FontAwesome5 } from '@expo/vector-icons';
import { PressableScale } from '@/shared/ui/pressable-scale';
import { SymbolView } from 'expo-symbols';

const items = [
  { label: 1 },
  { label: 2 },
  { label: 3 },
  { label: 4 },
  { label: 5 },
  { label: 6 },
  { label: 7 },
  { label: 8 },
  { label: 9 },
  { label: null },
  { label: 0 },
  { label: 'backspace' },
];

type ButtonsGridProps = {
  input: number;

};

const ButtonsGrid: FC<ButtonsGridProps> = memo(
  ({ input,  }) => {
    return (
      <View style={styles.container}>
        {items.map(({ label }, index) => {
          return (
            <PressableScale
              key={index}
              style={styles.input}
             >
              {typeof label === 'number' && (
                <Text style={styles.number}>{label}</Text>
              )}
              {label === 'backspace' && (
                <SymbolView name="chevron.left" size={24} tintColor="black" />
              )}
            </PressableScale>
          );
        })}
      </View>
    );
  },
);


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  input: {
    width: '30%',
    height: 50,               
    marginBottom: 20,          
    alignItems: 'center',
    justifyContent: 'center',  

    borderRadius: 16,
  },
  number: {
    color: 'black',
    fontSize: 24,
    // fontWeight: '600',
    textAlign: 'center',
  },
});

export { ButtonsGrid };
