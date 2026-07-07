from django.urls import path
from .views import (
    ApiRootView, SubmitRequestAPI, GetRankedProjectsAPI,
    GetComplaintsAPI, DevelopmentRequestDetailAPI
)

urlpatterns = [
    path('', ApiRootView.as_view(), name='api-root'),
    
    # ✅ trailing slash (/) add kar diya sabme:
    path('submit-request/', SubmitRequestAPI.as_view(), name='submit-request'),
    path('get-ranked-projects/', GetRankedProjectsAPI.as_view(), name='get-ranked-projects'),
    path('get-complaints/', GetComplaintsAPI.as_view(), name='get-complaints'),
    
    path('requests/<int:pk>/', DevelopmentRequestDetailAPI.as_view(), name='request-detail'),
    path('requests/<int:pk>', DevelopmentRequestDetailAPI.as_view(), name='request-detail-no-slash'),
]