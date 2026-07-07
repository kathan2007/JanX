from django.urls import path
from .views import (
    ApiRootView, SubmitRequestAPI, GetRankedProjectsAPI,
    GetComplaintsAPI, DevelopmentRequestDetailAPI, UpdateStatusAPI
)

urlpatterns = [
    path('', ApiRootView.as_view(), name='api-root'),

    # Trailing slash variants for all endpoints
    path('submit-request/', SubmitRequestAPI.as_view(), name='submit-request'),
    path('submit-request', SubmitRequestAPI.as_view(), name='submit-request-no-slash'),
    path('get-ranked-projects/', GetRankedProjectsAPI.as_view(), name='get-ranked-projects'),
    path('get-ranked-projects', GetRankedProjectsAPI.as_view(), name='get-ranked-projects-no-slash'),
    path('get-complaints/', GetComplaintsAPI.as_view(), name='get-complaints'),
    path('get-complaints', GetComplaintsAPI.as_view(), name='get-complaints-no-slash'),
    path('update-status/', UpdateStatusAPI.as_view(), name='update-status'),
    path('update-status', UpdateStatusAPI.as_view(), name='update-status-no-slash'),

    path('requests/<int:pk>/', DevelopmentRequestDetailAPI.as_view(), name='request-detail'),
    path('requests/<int:pk>', DevelopmentRequestDetailAPI.as_view(), name='request-detail-no-slash'),
]
