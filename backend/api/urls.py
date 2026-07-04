from django.urls import path
from .views import ApiRootView, SubmitRequestAPI, GetRankedProjectsAPI

urlpatterns = [
    path('', ApiRootView.as_view(), name='api-root'),
    path('submit-request', SubmitRequestAPI.as_view(), name='submit-request'),
    path('get-ranked-projects', GetRankedProjectsAPI.as_view(), name='get-ranked-projects'),
]
