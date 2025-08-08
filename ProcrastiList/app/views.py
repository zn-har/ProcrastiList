from django.shortcuts import render
from .models import Todo
from django.contrib.auth import get_user_model

User = get_user_model()

def index_view(request):
    todos = []
    if request.method == 'POST':
        print(request.POST)
    else:
        user = User.objects.get(username="answar")
        try:
            todos = Todo.objects.get(user=user)
        except:
            pass
    return render(request, 'index.html', context={'todos': todos})

