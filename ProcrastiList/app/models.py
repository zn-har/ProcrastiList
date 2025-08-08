from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Todo(models):
    user = models.ForeignKey(User, on_delete=models.CASCADE) 
    task = models.CharField(max_length=100, blank=False, null=False)
    completed = models.BooleanField(default=False)
    