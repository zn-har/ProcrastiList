from django.contrib import admin
from django.urls import path, include
from app.views import index_view


urlpatterns = [
    path('admin/', admin.site.urls),
    # path('', index_view, name='index'),
    path('', include('app.urls'))
]
