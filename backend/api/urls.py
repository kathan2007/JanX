from django.urls import path
from .views import ApiRootView, SubmitRequestAPI, GetRankedProjectsAPI, GetComplaintsAPI, UpdateStatusAPI

urlpatterns = [
    path('', ApiRootView.as_view(), name='api-root'),
    path('submit-request', SubmitRequestAPI.as_view(), name='submit-request'),
    path('get-ranked-projects', GetRankedProjectsAPI.as_view(), name='get-ranked-projects'),
    path('get-complaints', GetComplaintsAPI.as_view(), name='get-complaints'),
    path('update-status', UpdateStatusAPI.as_view(), name='update-status'),
]
