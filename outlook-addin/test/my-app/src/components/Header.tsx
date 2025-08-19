import React from 'react';
import { Stack, Text } from '@fluentui/react';
import { Mail24Regular } from '@fluentui/react-icons';

const Header: React.FC = () => {
  return (
    <Stack
      horizontal
      verticalAlign="center"
      tokens={{ childrenGap: 8 }}
      styles={{
        root: {
          padding: '16px',
          backgroundColor: '#0078d4',
          color: 'white',
          borderBottom: '1px solid #e1e1e1'
        }
      }}
    >
      <Mail24Regular style={{ fontSize: '20px', color: 'white' }} />
      <Text variant="mediumPlus" styles={{ root: { color: 'white', fontWeight: 600 } }}>
        Email Template Generator
      </Text>
    </Stack>
  );
};

export default Header;
