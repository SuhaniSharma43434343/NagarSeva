import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/Surveyor/DashboardScreen';
import AssignmentDetailScreen from '../screens/Surveyor/AssignmentDetailScreen';
import SurveyScreen from '../screens/Surveyor/SurveyScreen';
import SurveyCompleteScreen from '../screens/Surveyor/SurveyCompleteScreen';
import { RouteAssignment, SurveySession } from '../types';

export type SurveyorStackParamList = {
    Dashboard: undefined;
    AssignmentDetail: { assignment: RouteAssignment };
    Survey: { assignment: RouteAssignment };
    SurveyComplete: { 
        frameCount: number;
        assignmentId: string;
        routeName?: string;
        duration?: number;
        issuesDetected?: number;
    };
};

const Stack = createNativeStackNavigator<SurveyorStackParamList>();

export default function SurveyorNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
            <Stack.Screen name="Survey" component={SurveyScreen} />
            <Stack.Screen name="SurveyComplete" component={SurveyCompleteScreen} />
        </Stack.Navigator>
    );
}
