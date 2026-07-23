import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IssuesScreen } from '../screens/Engineer/IssuesScreen';
import { IssueDetailScreen } from '../screens/Engineer/IssueDetailScreen';
import { ConfirmationScreen } from '../screens/Engineer/ConfirmationScreen';
// The Engineer App types might be differently defined, but usually follow this structure.
// If types are missing from surveyorApp/src/types, we will add them later or use any for now.

export type EngineerStackParamList = {
    Issues: undefined;
    IssueDetail: { issue: any };
    Confirmation: { issue: any };
};

const Stack = createNativeStackNavigator<EngineerStackParamList>();

export default function EngineerNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Issues" component={IssuesScreen} />
            <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
            <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
        </Stack.Navigator>
    );
}
